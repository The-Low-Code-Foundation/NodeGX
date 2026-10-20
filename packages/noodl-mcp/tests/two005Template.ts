/**
 * TWO-005 — the community app as a project: authored through the real MCP door, then copied into `templates/gram/`
 * beside the files that are NOT generated. The marketplace's generator (`two003Template.ts`), pointed at the gram.
 *
 *     npm run template:gram
 *
 * 🔴 **Three things in `templates/gram/` are hand-written and survive every regeneration:** `docs/` (the world,
 * TWO-001), `backend/schema.json` (its projection, byte-gated by `two-001-gram-policy.test.ts`) and
 * `nodegx.security.json` (the policy). This clears only what it writes (`components/`, `nodegx.project.json`) and
 * copies the policy IN to the door's scratch project first, because the door reads it (DEF-009).
 *
 * @module noodl-mcp/tests/two005Template
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../src/server';

import { copyTree, pinComponentFiles, pinProjectModified, pinRegistry } from './templatePins';
import { CloudComponent } from './two003Cloud';
import { GRAM_SLICE1_CLOUD, GRAM_SLICE1_FUNCTION_RULES } from './two005Cloud';
import { GRAM_SLICE2_CLOUD, GRAM_SLICE2_FUNCTION_RULES } from './two005Feed';
import { GRAM_SLICE3_CLOUD, GRAM_SLICE3_FUNCTION_RULES } from './two005Profile';
import { GRAM_SLICE4_CLOUD, GRAM_SLICE4_FUNCTION_RULES } from './two005Prayer';
import { GRAM_SLICE5_CLOUD, GRAM_SLICE5_FUNCTION_RULES } from './two005Moderate';
import { TWO005_PRESET, TWO005_TOKENS } from './two005Look';
import { GRAM_APP_NODES, GRAM_SLICE1_LEAVES, GRAM_SLICE1_PAGES } from './two005Pages';
import { GRAM_SLICE2_LEAVES, GRAM_SLICE2_PAGES } from './two005FeedPages';
import { GRAM_SLICE3_LEAVES, GRAM_SLICE3_PAGES } from './two005ProfilePages';
import { GRAM_SLICE4_LEAVES, GRAM_SLICE4_PAGES } from './two005PrayerPages';
import { GRAM_QUEUE_PAGE, GRAM_RULES_PAGE, GRAM_SLICE5_LEAVES, GRAM_SLICE5_PAGES } from './two005ModeratePages';
import { PageComponent } from './two003Pages';

export const TEMPLATE_ID = 'gram';
export const TEMPLATE_NAME = 'The gram';
export const TEMPLATE_EPOCH = '2026-10-14T00:00:00.000Z';
export const TEMPLATE_DIR = path.join(__dirname, '..', '..', '..', 'templates', TEMPLATE_ID);
export const POLICY_FILE = path.join(TEMPLATE_DIR, 'nodegx.security.json');

/** Every cloud function the template carries (slices 1 to 5), and the policy's call rule for each. */
export const GRAM_CLOUD: CloudComponent[] = [...GRAM_SLICE1_CLOUD, ...GRAM_SLICE2_CLOUD, ...GRAM_SLICE3_CLOUD, ...GRAM_SLICE4_CLOUD, ...GRAM_SLICE5_CLOUD];
export const FUNCTION_RULES = {
  ...GRAM_SLICE1_FUNCTION_RULES,
  ...GRAM_SLICE2_FUNCTION_RULES,
  ...GRAM_SLICE3_FUNCTION_RULES,
  ...GRAM_SLICE4_FUNCTION_RULES,
  ...GRAM_SLICE5_FUNCTION_RULES
};

/**
 * The app-wide variables the template shares on purpose, and why: each is one value for the whole app by design, so
 * every Variable or Set Variable of that name says so in its comment (the door's `variable-in-repeated-component`
 * escape, GAM-005), and the warning stays for any variable shared by accident.
 */
export const SHARED_ON_PURPOSE: Record<string, string> = {
  membersChanged: 'a member was let in, turned away or made an admin: the list reads again, whichever row changed it',
  membersNote: 'what the admin did last: the queue says it once the row has gone',
  feedChanged: 'a heart, a comment or a post was made on this phone: the feed and the post read again, whichever card made it',
  postPhotoRemoved: 'a photo was taken off the new post: the list drops it, whichever tile said so'
};
const sayShared = (n: Record<string, unknown>) => {
  const name = (n.parameters as Record<string, unknown> | undefined)?.name;
  return (n.type === 'Variable2' || n.type === 'Set Variable') && typeof name === 'string' && SHARED_ON_PURPOSE[name]
    ? { ...n, comment: `Shared on purpose: ${SHARED_ON_PURPOSE[name]}.` }
    : n;
};

/** What this generator owns inside the template folder; nothing else there is touched. */
export const GENERATED = ['components', 'nodegx.project.json'];

export interface BuiltGram {
  projectDir: string;
  order: string[];
  diagnostics: Array<{ component: string; code: string; severity: string; message: string }>;
}

function writeSkeleton(dir: string): void {
  fs.mkdirSync(path.join(dir, 'components'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'nodegx.project.json'),
    JSON.stringify(
      {
        $schema: 'https://opennoodl.dev/schemas/project-v2.json',
        name: TEMPLATE_NAME,
        version: '4',
        nodegxVersion: '1.1.0',
        settings: { htmlTitle: TEMPLATE_NAME, navigationPathType: 'path', bodyScroll: true },
        structure: { componentsDir: 'components', assetsDir: 'assets' }
      },
      null,
      2
    ) + '\n'
  );
  fs.writeFileSync(
    path.join(dir, 'components', '_registry.json'),
    JSON.stringify(
      { $schema: 'https://opennoodl.dev/schemas/registry-v2.json', version: 1, lastUpdated: TEMPLATE_EPOCH, components: {}, stats: { totalComponents: 0, totalNodes: 0, totalConnections: 0 } },
      null,
      2
    ) + '\n'
  );
}

/** A component's plan declaration, read from its own interface nodes and the components it places. */
function declaration(c: { nodes: Array<Record<string, unknown>> }) {
  const portsOf = (type: string) =>
    c.nodes
      .filter((n) => n.type === type)
      .flatMap((n) => (n.ports as Array<{ name: string; type: string }>) ?? [])
      .map((p) => ({ name: p.name, type: p.type }));
  const instantiates = [...new Set(c.nodes.map((n) => String(n.type)).filter((t) => t.startsWith('/')).map((t) => t.replace(/^\//, '')))];
  return {
    ...(portsOf('Component Inputs').length ? { inputs: portsOf('Component Inputs') } : {}),
    ...(instantiates.length ? { instantiates } : {})
  };
}

export async function buildGram(): Promise<BuiltGram> {
  process.env.NODEGX_RENDER_DISABLED = '1';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'two005-gram-'));
  writeSkeleton(dir);
  fs.copyFileSync(POLICY_FILE, path.join(dir, 'nodegx.security.json'));

  const { server } = createServer({ projectDir: dir, allowWrites: true });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'two005-gram', version: '0.0.0' });
  await Promise.all([server.connect(st), client.connect(ct)]);
  const diagnostics: BuiltGram['diagnostics'] = [];
  const order: string[] = [];
  const call = async (name: string, args: Record<string, unknown>, label: string) => {
    const res = (await client.callTool({ name, arguments: args })) as { isError?: boolean; content?: Array<{ text: string }> };
    if (res.isError) throw new Error(`${name} ${label} refused:\n${res.content?.[0]?.text}`);
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(res.content?.[0]?.text ?? '{}');
    } catch {
      return {};
    }
    const raised = (payload.validation as { diagnostics?: Array<Record<string, unknown>> } | undefined)?.diagnostics;
    for (const d of raised ?? []) diagnostics.push({ component: label, code: String(d.code ?? ''), severity: String(d.severity ?? ''), message: String(d.message ?? '') });
    return payload;
  };

  await call('find_tools', { group: 'theme' }, 'theme:reveal');
  await call('set_style_preset', { preset_id: TWO005_PRESET }, 'theme:preset');
  await call('set_project_tokens', { tokens: [...TWO005_TOKENS] }, 'theme:tokens');

  for (const fn of GRAM_CLOUD) {
    await call('create_component', { path: fn.path, nodes: fn.nodes, connections: fn.connections, description: fn.description }, fn.path);
    order.push(fn.path);
  }
  await call('create_component', { path: 'App', nodes: GRAM_APP_NODES, connections: [] }, 'App');
  order.push('App');

  // One plan: pages navigate to pages written after them. The router opens on the first page registered: the start.
  const COMPONENTS: PageComponent[] = [
    ...GRAM_SLICE1_LEAVES,
    ...GRAM_SLICE2_LEAVES,
    ...GRAM_SLICE3_LEAVES,
    ...GRAM_SLICE4_LEAVES,
    ...GRAM_SLICE5_LEAVES,
    ...GRAM_SLICE1_PAGES,
    GRAM_RULES_PAGE,
    GRAM_QUEUE_PAGE,
    ...GRAM_SLICE2_PAGES,
    ...GRAM_SLICE3_PAGES,
    ...GRAM_SLICE4_PAGES,
    ...GRAM_SLICE5_PAGES
  ];
  const plan = await call(
    'create_plan',
    {
      request:
        'The community app, slices 1 to 5: a person asks to join with their name, their email and that they are 13 or older, and waits; an admin lets them in or not, and makes members admins; members sign in with a link sent by email, the first admin with a password made at set-up. Members share posts with photos only members see, heart them and comment under them, and the counts move without a reload. Each member has a profile every member can see: a photo only members see, their name, a short bio and the grid of their posts. A member asks the others to pray in a prayer request; members press I prayed, everyone sees how many, and only the person who asked sees who. The sections are a bar at the bottom of a phone and a rail on a tablet. A member reports a post or a comment to the admins, saying why, and takes their own down; an admin looks at what was reported (a child shown without a parent’s yes first), hides it from the members with the reason or brings it back, blocks a member with the reason or lets them back, and writes the community rules.',
      scroll: 'page',
      operations: COMPONENTS.map((c) => ({ kind: 'create', target: c.path, intent: c.description, ...declaration(c) }))
    },
    'plan'
  );
  const operations = plan.operations as Array<{ id: string; target: string }>;
  for (const c of COMPONENTS) {
    const op = operations.find((o) => o.target.replace(/^\//, '') === c.path.replace(/^\//, ''));
    if (!op) throw new Error(`the plan has no operation for ${c.path}`);
    await call('stage_plan_operation', { plan_id: String(plan.planId), operation_id: op.id, nodes: c.nodes.map(sayShared), connections: c.connections, description: c.description }, c.path);
    order.push(c.path);
  }
  await call('apply_plan', { plan_id: String(plan.planId), render: 'off' }, 'apply');
  // As the marketplace's: the editor opens on `rootNodeId` only (P121-S19-NOHOME).
  await call('find_tools', { group: 'project' }, 'project:reveal');
  await call('set_project_settings', { home: 'App' }, 'home');
  await client.close();
  await server.close();
  return { projectDir: dir, order, diagnostics };
}

/** Replace what this generator owns in `output`, pinned so a regeneration is byte-identical; leave the rest alone. */
export function prepareGram(built: BuiltGram, output: string): void {
  if (path.basename(output) !== TEMPLATE_ID) throw new Error(`refusing to write into ${output}`);
  pinComponentFiles(built.projectDir, TEMPLATE_ID, TEMPLATE_EPOCH);
  pinRegistry(built.projectDir, TEMPLATE_EPOCH);
  pinProjectModified(built.projectDir, TEMPLATE_EPOCH);
  for (const owned of GENERATED) fs.rmSync(path.join(output, owned), { recursive: true, force: true });
  copyTree(path.join(built.projectDir, 'components'), path.join(output, 'components'));
  fs.copyFileSync(path.join(built.projectDir, 'nodegx.project.json'), path.join(output, 'nodegx.project.json'));
}
