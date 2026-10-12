/**
 * CG-003 — Olive's Island (slug `bot-garden`) as a project a family starts from, authored through the real MCP server's PLAN DOOR
 * (`create_plan` → `stage_plan_operation` × N → `apply_plan`), every interface declared.
 *
 * `cg003Components.ts` is what the door is given; this file is the composition, and the one place the directory a person
 * is handed (`templates/bot-garden/`) is prepared, so the gate runs the same code as `npm run template:garden`.
 *
 * In order: the kits (`garden-kit`, `game-kit`) and the template's own fonts (`bot-garden-fonts`) are installed BEFORE
 * authoring, because the door only knows a module's nodes once it is in `noodl_modules/`; the look (the Playful preset,
 * which brings Nunito, then the mockup's tokens); `App` (the router and the stylesheet), written directly; then one plan.
 *
 * The render is off for the same reason TPL-007 gives: a render per apply inside jest and ts-node is paid by every gate
 * run, and the evidence is collected once by `drive-cg003-pages.js` against the deployed artefact.
 *
 * @module noodl-mcp/tests/cg003Template
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import type { LegacyProject } from '../../noodl-editor/src/editor/src/io/ProjectExporter';
import { createServer } from '../src/server';

import { readAsLegacyProject } from './templateArtefact';
import { copyTree } from './templatePins';
import { APP_NODES, APP_WIRES, C, CG003_COMPONENTS, CgComponent, GAME_NAME, PAGES, REQUIRED_MODULES } from './cg003Components';
import { GARDEN_PRESET, GARDEN_TOKENS } from './cg007Look';
import { gardenScriptSources, shareScript } from './isl005GardenScripts';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { dropReferencedKits } = require('../../../scripts/library/resolve-template-kits.js') as {
  dropReferencedKits: (projectDir: string) => string[];
};

export const TEMPLATE_ID = 'bot-garden';
/** What a person sees the project called (ruling 7). The template's id, its folder and the storage key stay bot-garden. */
export const TEMPLATE_PROJECT_NAME = GAME_NAME;
export const TEMPLATE_EPOCH = '2026-09-27T00:00:00.000Z';
export const START_HERE_FILE = 'docs/START-HERE.md';

const MODULE_LIBRARY = path.join(__dirname, '..', '..', '..', 'library', 'modules');
/** Modules only this template ships (its title face), beside the template's source. */

interface ToolResult {
  isError?: boolean;
  content?: Array<{ type: string; text: string }>;
}

export interface AuthoredGarden {
  project: LegacyProject;
  order: string[];
  planId: string;
  registrations: Record<string, unknown>;
  projectDir: string;
  diagnostics: Array<{ component: string; code: string; severity: string; message: string }>;
  modules: string[];
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
      { $schema: 'https://opennoodl.dev/schemas/registry-v2.json', version: 1, lastUpdated: TEMPLATE_EPOCH, components: {}, stats: { totalComponents: 0, totalNodes: 0, totalConnections: 0 } },
      null,
      2
    )
  );
}

/**
 * The library entries the garden installs, kits first, then its own fonts. P109 ISL-017 AC6: through the door's
 * `install_prefab`, as an agent would ask for them — the hand copy (`fs.cpSync` before the server started) is gone.
 */
export const GARDEN_MODULE_ENTRIES: readonly string[] = [...REQUIRED_MODULES, 'bot-garden-fonts'];

/** Refuse before the door does, with the command: a kit the library has not built would install an empty folder. */
function requireBuiltKits(): void {
  for (const name of REQUIRED_MODULES) {
    const from = path.join(MODULE_LIBRARY, name, 'project', 'noodl_modules');
    if (!fs.existsSync(path.join(from, name, 'index.js'))) throw new Error(`library module "${name}" is not built at ${from}`);
  }
}

/** A component's plan declaration, read off its own interface nodes and the components it places (TPL-011's way). */
export function declaration(c: CgComponent): Record<string, unknown> {
  const portsOf = (type: string) =>
    c.nodes
      .filter((n) => n.type === type)
      .flatMap((n) => (n.ports as Array<{ name: string; type: string }>) ?? [])
      .map((p) => ({ name: p.name, type: p.type }));
  const instantiates = [...new Set(c.nodes.map((n) => String(n.type)).filter((t) => t.startsWith('/')).map((t) => t.replace(/^\//, '')))];
  return {
    ...(portsOf('Component Inputs').length ? { inputs: portsOf('Component Inputs') } : {}),
    ...(portsOf('Component Outputs').length ? { outputs: portsOf('Component Outputs') } : {}),
    ...(instantiates.length ? { instantiates } : {}),
    ...(c.repeats ? { repeats: c.repeats } : {})
  };
}

export interface BuildOptions {
  components?: ReadonlyArray<CgComponent>;
  /**
   * P109 ISL-019 AC7's control arm only: start the door on the wall clock, as an agent's session does. The artefact
   * then differs from the checked-in one in every `component.json` and the registry, which is what the gate must see.
   */
  wallClock?: boolean;
}

/**
 * P109 ISL-005: a component as the artefact carries it. A Function that held a pasted shared block lists that block's
 * file under Uses (stored as the editor's string list stores it) and reaches it through `Scripts`.
 */
export function withSharedScripts(c: CgComponent): CgComponent {
  let changed = false;
  const nodes = c.nodes.map((n) => {
    const params = (n.parameters ?? {}) as Record<string, unknown>;
    if (n.type !== 'JavaScriptFunction' || typeof params.functionScript !== 'string') return n;
    const shared = shareScript(params.functionScript);
    if (!shared.uses.length) return n;
    changed = true;
    return { ...n, parameters: { ...params, functionScript: shared.script, uses: shared.uses.join(',') } };
  });
  return changed ? { ...c, nodes } : c;
}

/** Author the whole template through the plan door and read it back. */
export async function buildGardenTemplateProject(options: BuildOptions = {}): Promise<AuthoredGarden> {
  process.env.NODEGX_RENDER_DISABLED = '1';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg003-garden-'));
  writeSkeleton(dir);
  requireBuiltKits();
  const components = (options.components ?? CG003_COMPONENTS).map(withSharedScripts);

  // P109 ISL-019 AC7: the door writes the stable bytes itself (ids from the 'cg003' namespace, every stamp the epoch),
  // so the artefact needs no pins. The pins wrote a trailing newline the door and the editor both leave out (ISL-018),
  // so dropping them re-baselined every component file and the registry by that one byte, once.
  const reproducible = options.wallClock ? undefined : { namespace: 'cg003', epoch: TEMPLATE_EPOCH };
  const { server } = createServer({ projectDir: dir, allowWrites: true, reproducible });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'cg003-garden', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  const order: string[] = [];
  const registrations: Record<string, unknown> = {};
  const diagnostics: AuthoredGarden['diagnostics'] = [];

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
    for (const d of raised ?? []) diagnostics.push({ component: label, code: String(d.code ?? ''), severity: String(d.severity ?? ''), message: String(d.message ?? '') });
    return payload;
  };

  try {
    // The kits and the fonts, through the door (ISL-017 AC6). Each install refreshes the kit overlay, so the
    // authoring below knows every kit node type in this same session.
    await call('find_tools', { group: 'explore' }, 'explore:reveal');
    const modules: string[] = [];
    for (const slug of GARDEN_MODULE_ENTRIES) {
      const installed = await call('install_prefab', { slug, type: 'module' }, `install:${slug}`);
      const names = (installed.modulesInstalled as string[] | undefined) ?? [];
      if (names.length === 0 || installed.kitLoadFailures) {
        throw new Error(`install_prefab ${slug} installed nothing usable: ${JSON.stringify(installed)}`);
      }
      modules.push(...names);
    }

    // The look first.
    await call('find_tools', { group: 'theme' }, 'theme:reveal');
    await call('set_style_preset', { preset_id: GARDEN_PRESET }, 'theme:preset');
    await call('set_project_tokens', { tokens: [...GARDEN_TOKENS] }, 'theme:tokens');

    // P109 ISL-005: the shared code as script files, through the door, before any Function names one (the write gate
    // refuses a Uses entry naming no file).
    await call('find_tools', { group: 'project' }, 'project:reveal');
    for (const [file, content] of Object.entries(gardenScriptSources())) await call('write_script_file', { path: file, content }, `script:${file}`);

    const app = await call('create_component', { path: C.app, nodes: APP_NODES, connections: APP_WIRES }, C.app);
    order.push(C.app);
    if (app.registeredPages) registrations[C.app] = app.registeredPages;

    const plan = await call(
      'create_plan',
      {
        request:
          'Olive’s Island — a kids’ coding game: teach a robot by driving it, the game folds the repetition into a loop, an offline owl helps. Six screens, EN and FR, two age bands, one island per kid, the family saved on this computer, no account.',
        scroll: 'page',
        operations: components.map((c) => ({ kind: 'create', target: c.path, intent: c.description, ...declaration(c) }))
      },
      'plan'
    );
    const planId = String(plan.planId);
    const operations = plan.operations as Array<{ id: string; target: string }>;
    for (const c of components) {
      const op = operations.find((o) => o.target === c.path);
      if (!op) throw new Error(`the plan has no operation for ${c.path}; it has ${operations.map((o) => o.target).join(', ')}`);
      await call('stage_plan_operation', { plan_id: planId, operation_id: op.id, nodes: c.nodes, connections: c.connections, description: c.description }, c.path);
      order.push(c.path);
    }
    const applied = await call('apply_plan', { plan_id: planId, render: 'off' }, 'apply');
    for (const [k, v] of Object.entries((applied.registeredPages as Record<string, unknown>) ?? {})) registrations[k] = v;
    // P109 ISL-016 AC7: the home through the door, at the point `pinRootNode` ran (after the plan, so `rootNodeId`
    // still lands last, after the plan's `modified`). The raw write after the door closed is gone.
    await call('find_tools', { group: 'project' }, 'project:reveal');
    await call('set_project_settings', { home: C.app }, 'home');
    return { project: readAsLegacyProject(dir), order, planId, registrations, projectDir: dir, diagnostics, modules, applied };
  } finally {
    await client.close();
    await server.close();
  }
}

// ── The directory a person is handed ────────────────────────────────────────

export function prepareGardenArtefact(built: AuthoredGarden, output: string): void {
  // P109 ISL-018 AC6: the raw run-on-change settle (`pinRunOnValueChangeDefaultsInDirectory`) ran here. The door ticks the
  // box on every node it writes, so it wrote 0 of 187 family nodes (measured s46) and is gone; the byte gate checks the door.

  if (path.basename(output) !== TEMPLATE_ID) throw new Error(`refusing to clear ${output}`);
  fs.rmSync(output, { recursive: true, force: true });
  copyTree(built.projectDir, output);

  if (fs.existsSync(path.join(output, 'components', '__cloud__'))) throw new Error('refusing to write: Olive’s Island ships no backend, and a __cloud__ component was authored');
  for (const name of [...REQUIRED_MODULES, 'bot-garden-fonts']) {
    if (!fs.existsSync(path.join(output, 'noodl_modules', name, 'manifest.json'))) throw new Error(`refusing to write: noodl_modules/${name} is missing`);
  }
  // P109 ISL-017 ruling 2, "copy on install": the template keeps `kit-provenance.json` (each record names its library
  // entry and version) and not the built kits — they are copied back from library/ by whatever copies the template to
  // run it (`resolveTemplateCopy`) and by the shelf publish. Only a folder byte-identical to the library's is dropped.
  dropReferencedKits(output);
  writeStartHere(output);
}

function writeStartHere(output: string): void {
  const lines = [
    `# ${TEMPLATE_PROJECT_NAME}`,
    '',
    'A coding game for 7–12 year olds, in English and French, built entirely out of NodeGX nodes. A child drives a',
    'small robot by hand, watches her steps appear as blocks, and lets the game fold the repetition into a loop.',
    'Nothing is timed, scored or streaked; the reward is a hat.',
    '',
    'There is no backend and no account. The family lives on this computer (localStorage, key `bot-garden`): one',
    'island per kid, each with her own requests done and her own robot. The Grown-ups screen shows a save code that',
    'carries the whole family to another computer.',
    '',
    '## The first thing to change',
    '',
    'Open **Data/Requests** and find the node labelled **"EDIT — the requests: this list IS the island"**. It is a',
    '`Static Data` node holding a JSON array; one entry is one islander asking for help: its map (rows of letters),',
    'the things on it, where the robot starts, the goal (a named check, never code), the blocks offered, and the',
    'reward. Add one and it is on the island. Every word is one row in **Data/Words**, English and French (a request’s',
    'line under the Workshop title too).',
    '',
    '## How it works, in the graph',
    '',
    '- **`Logic/*` are the named utilities.** The engine (`Logic/Step`, `Logic/Fold`, `Logic/Choose hint` …) and the',
    '  glue between it and the screen (`Logic/Record step`, `Logic/Draw world` …) — each a `Component Inputs` → one',
    '  Function → `Component Outputs`. `Logic/Step` runs one step of a program and returns what changed;',
    '  `Logic/Apply delta` is the only thing that ever changes the world.',
    '- **`scripts/` holds the code the Functions share.** The robot’s rules live in `engine.js`: the tiles, the step and',
    '  the sensors. A Function lists the files it needs under **Uses** and reaches each one by its name, so `engine.js` is',
    '  `Scripts.engine`. Change the engine there once. Every Function that uses it changes with it.',
    '- **`Workshop/Runner` is the loop:** one step, a Timer, the next step, until the run is done.',
    '- **The Teach pad drives the robot with the engine’s own step**, so what the child drives is exactly what',
    '  Play will do. The fold is only ever offered; the child taps "Fold it".',
    '- **The owl’s hints are a table** (`Data/Hints`). The game picks the line; Olive, the offline model, may only',
    '  say it in her own words (the desktop shell’s `/__garden/olive`). With no model, the written line is shown.',
    '',
    '## Library modules travel with this project',
    '',
    '`noodl_modules/garden-kit` draws the blocks and the garden; `noodl_modules/game-kit` draws the faces.',
    '`noodl_modules/bot-garden-fonts` is Fredoka (SIL OFL 1.1, the licence beside it). Nothing is fetched at runtime.'
  ];
  const file = path.join(output, START_HERE_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.join('\n') + '\n');
}

export const PAGE_COUNT = PAGES.length;
