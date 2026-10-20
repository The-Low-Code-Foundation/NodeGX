/**
 * TWO-003 — the marketplace as a project: authored through the real MCP door, then copied into
 * `templates/marketplace/` beside the files that are NOT generated.
 *
 *     npm run template:marketplace
 *
 * 🔴 **Three things in `templates/marketplace/` are hand-written and survive every regeneration:** `docs/` (the world,
 * TWO-001), `backend/schema.json` (its projection, byte-gated by the TWO-001 spec) and `nodegx.security.json` (the
 * policy, its two specs and 32 mutants). The members' generator clears its folder wholesale and keeps its policy
 * beside it for that reason; this one clears only what it writes (`components/`, `nodegx.project.json`) and copies
 * the policy IN to the door's scratch project first, because the door reads it (DEF-009).
 *
 * @module noodl-mcp/tests/two003Template
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../src/server';

import { copyTree, pinComponentFiles, pinProjectModified, pinRegistry } from './templatePins';
import { CloudComponent, SLICE1_CLOUD, SLICE1_FUNCTION_RULES } from './two003Cloud';
import { SLICE3_CLOUD, SLICE3_FUNCTION_RULES } from './two003Checkout';
import { TWO003_PRESET, TWO003_TOKENS } from './two003Look';
import { APP_NODES, PageComponent, SLICE1_LEAVES, SLICE1_SCREENS } from './two003Pages';
import { SLICE3_ADMIN_LEAVES, SLICE3_ADMIN_PAGES } from './two003Admin';
import { SLICE3_SHOP_LEAVES, SLICE3_SHOP_PAGES } from './two003Basket';
import { SLICE4_CLOUD, SLICE4_FUNCTION_RULES, SLICE4_LEAVES, SLICE4_PAGES } from './two003Orders';
import { SLICE5_CLOUD, SLICE5_FUNCTION_RULES, SLICE5_LEAVES, SLICE5_PAGES } from './two003Enquire';
import { SLICE2_LEAVES, SLICE2_PAGES } from './two003Shop';
import { SLICE6_CLOUD, SLICE6_FUNCTION_RULES } from './two004Paystack';

export const TEMPLATE_ID = 'marketplace';
export const TEMPLATE_NAME = 'The marketplace';
export const TEMPLATE_EPOCH = '2026-10-14T00:00:00.000Z';
export const TEMPLATE_DIR = path.join(__dirname, '..', '..', '..', 'templates', TEMPLATE_ID);
export const POLICY_FILE = path.join(TEMPLATE_DIR, 'nodegx.security.json');

/** Every cloud function the template carries (slices 1, 3, 4, 5 and 6), and the policy's call rule for each. */
export const MARKETPLACE_CLOUD: CloudComponent[] = [...SLICE1_CLOUD, ...SLICE3_CLOUD, ...SLICE4_CLOUD, ...SLICE5_CLOUD, ...SLICE6_CLOUD];
export const FUNCTION_RULES = { ...SLICE1_FUNCTION_RULES, ...SLICE3_FUNCTION_RULES, ...SLICE4_FUNCTION_RULES, ...SLICE5_FUNCTION_RULES, ...SLICE6_FUNCTION_RULES };

/**
 * The app-wide variables the template shares on purpose, and why: each is one value for the whole app by design, so
 * every Variable or Set Variable of that name says so in its comment (the door's `variable-in-repeated-component`
 * escape, GAM-005), and the warning stays for any variable shared by accident.
 */
export const SHARED_ON_PURPOSE: Record<string, string> = {
  marketplaceName: 'the marketplace’s name: one for the whole app, read by every page’s bar',
  currency: 'the currency a buyer picked, the same on every page',
  shelf: 'the shelf picked: one pick for every chip',
  basket: 'the basket on this phone: every page shows the same one',
  lastOrder: 'the order this phone placed last: the bottom bar on every page offers it',
  payPicks: 'the way picked for each seller country: one pick per country, across every option',
  productsChanged: 'a product changed: the list reads again, whichever row changed it',
  photoRemoved: 'which photo was taken off: the form keeps one list, whichever tile said so',
  waysChanged: 'the ways to pay changed: the page reads again, whichever switch or card changed them',
  ratesTyped: 'the rates typed so far: one map for every row, saved together',
  shelvesChanged: 'a shelf changed: the list reads again, whichever row changed it',
  ordersChanged: 'an order part moved: the Orders page reads again, whichever card moved it',
  enquiriesChanged: 'an enquiry was marked: the Enquiries page reads again, whichever card marked it'
};
const sayShared = (n: Record<string, unknown>) => {
  const name = (n.parameters as Record<string, unknown> | undefined)?.name;
  return (n.type === 'Variable2' || n.type === 'Set Variable') && typeof name === 'string' && SHARED_ON_PURPOSE[name]
    ? { ...n, comment: `Shared on purpose: ${SHARED_ON_PURPOSE[name]}.` }
    : n;
};

/** What this generator owns inside the template folder; nothing else there is touched. */
export const GENERATED = ['components', 'nodegx.project.json'];

export interface BuiltMarketplace {
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

export async function buildMarketplace(): Promise<BuiltMarketplace> {
  process.env.NODEGX_RENDER_DISABLED = '1';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'two003-marketplace-'));
  writeSkeleton(dir);
  fs.copyFileSync(POLICY_FILE, path.join(dir, 'nodegx.security.json'));

  const { server } = createServer({ projectDir: dir, allowWrites: true });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'two003-marketplace', version: '0.0.0' });
  await Promise.all([server.connect(st), client.connect(ct)]);
  const diagnostics: BuiltMarketplace['diagnostics'] = [];
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
  await call('set_style_preset', { preset_id: TWO003_PRESET }, 'theme:preset');
  await call('set_project_tokens', { tokens: [...TWO003_TOKENS] }, 'theme:tokens');

  for (const fn of MARKETPLACE_CLOUD) {
    await call('create_component', { path: fn.path, nodes: fn.nodes, connections: fn.connections, description: fn.description }, fn.path);
    order.push(fn.path);
  }
  await call('create_component', { path: 'App', nodes: APP_NODES, connections: [] }, 'App');
  order.push('App');

  // One plan, not one write each: a page navigates to pages written after it. The router opens on the first page
  // registered, so the shop's home page goes first: buyers, who have no account, are most of the people who come.
  const [home, ...shop] = SLICE2_PAGES;
  const COMPONENTS: PageComponent[] = [
    ...SLICE1_LEAVES,
    ...SLICE2_LEAVES,
    ...SLICE3_SHOP_LEAVES,
    ...SLICE3_ADMIN_LEAVES,
    ...SLICE4_LEAVES,
    ...SLICE5_LEAVES,
    home,
    ...SLICE1_SCREENS,
    ...shop,
    ...SLICE3_SHOP_PAGES,
    ...SLICE3_ADMIN_PAGES,
    ...SLICE4_PAGES,
    ...SLICE5_PAGES
  ];
  const plan = await call(
    'create_plan',
    {
      request:
        'The marketplace, slices 1 to 6: buyers browse the shop, fill a basket, check out with no account and pay by card through Paystack, or message a seller about a product sold by enquiry; the admin manages sellers and their logins, the countries, rates, shelves and ways to pay, and sees every order and enquiry; a seller’s staff manage their products, move their part of each order along and answer enquiries.',
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
  // The editor opens a project on its `rootNodeId` only: without it a builder's first sight is "No HOME component
  // selected" (P121-S19-NOHOME, found driving R12 in the editor).
  await call('find_tools', { group: 'project' }, 'project:reveal');
  await call('set_project_settings', { home: 'App' }, 'home');
  await client.close();
  await server.close();
  return { projectDir: dir, order, diagnostics };
}

/** Replace what this generator owns in `output`, pinned so a regeneration is byte-identical; leave the rest alone. */
export function prepareMarketplace(built: BuiltMarketplace, output: string): void {
  if (path.basename(output) !== TEMPLATE_ID) throw new Error(`refusing to write into ${output}`);
  pinComponentFiles(built.projectDir, TEMPLATE_ID, TEMPLATE_EPOCH);
  pinRegistry(built.projectDir, TEMPLATE_EPOCH);
  pinProjectModified(built.projectDir, TEMPLATE_EPOCH);
  for (const owned of GENERATED) fs.rmSync(path.join(output, owned), { recursive: true, force: true });
  copyTree(path.join(built.projectDir, 'components'), path.join(output, 'components'));
  fs.copyFileSync(path.join(built.projectDir, 'nodegx.project.json'), path.join(output, 'nodegx.project.json'));
}
