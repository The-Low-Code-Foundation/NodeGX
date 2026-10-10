/**
 * P109 ISL-034 / P109-S18 — a Router left with no Name answers each URL with its own page, deployed.
 *
 *     ts-node -T -P ./scripts/tsconfig.json ./scripts/devtools/isl034-unnamed-router.ts <work-dir> [--named]
 *
 * The project is authored through the real door (`createServer`, in-process): `/App` holds one Router with NO `name`
 * (the Name port says to leave it blank when there is only one), then two pages the door registers in it. `nodegx
 * deploy` (gated on its exit code), then a headless Chrome reads `/robot` and `/olive` and the deployed
 * `projectData.routerIndex.routers`. Before the fix the index was `[]` and both URLs showed the start page (the door
 * makes it Robot here), so `/olive` is the clause that reads red on the old exporter (measured s39 on a copy of the
 * deploy engine with the old two lines patched back in, run from `noodl-preview/dist/` so it finds the viewer runtime).
 * `--named` writes `name: 'Main'` instead: the arm that always worked, 6/6 on the old engine too.
 *
 * Exits 0 when every clause passed, 1 when any failed, 2 on a usage error.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../../packages/noodl-mcp/src/server';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { withDeployedSite } = require('./drive-deployed.js');

const REPO = path.join(__dirname, '..', '..');
const WORK = process.argv[2];
const NAMED = process.argv.includes('--named');
if (!WORK || WORK.startsWith('--')) {
  console.error('usage: isl034-unnamed-router.ts <work-dir> [--named]');
  process.exit(2);
}

const results: Array<{ name: string; ok: boolean; saw: unknown }> = [];
const check = (name: string, ok: boolean, saw: unknown) => {
  results.push({ name, ok, saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${JSON.stringify(saw)}`}`);
};

function skeleton(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'components'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'nodegx.project.json'),
    JSON.stringify(
      { name: 'ISL-034 unnamed router', version: '4', nodegxVersion: '1.1.0', settings: { navigationPathType: 'path' }, structure: { componentsDir: 'components', assetsDir: 'assets' } },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(dir, 'components', '_registry.json'),
    JSON.stringify({ version: 1, lastUpdated: '2026-10-10T00:00:00.000Z', components: {}, stats: { totalComponents: 0, totalNodes: 0, totalConnections: 0 } }, null, 2)
  );
}

const page = (slug: string, name: string) => ({
  nodes: [
    { id: `${slug}Page`, type: 'Page', parameters: { title: name, urlPath: slug } },
    { id: `${slug}Line`, type: 'Text', parent: `${slug}Page`, parameters: { text: `This is ${name}`, dataAttributes: 'data-isl034', 'data-isl034': slug } }
  ],
  connections: []
});

async function author(dir: string): Promise<void> {
  process.env.NODEGX_RENDER_DISABLED = '1';
  skeleton(dir);
  const { server } = createServer({ projectDir: dir, allowWrites: true });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'isl034-unnamed-router', version: '0.0.0' });
  await Promise.all([server.connect(b), client.connect(a)]);
  const call = async (name: string, args: Record<string, unknown>) => {
    const res = (await client.callTool({ name, arguments: args })) as { isError?: boolean; content?: Array<{ text: string }> };
    if (res.isError) throw new Error(`${name} refused: ${res.content?.[0]?.text}`);
    return res;
  };
  try {
    await call('find_tools', { group: 'project' });
    const router = NAMED ? { id: 'router', type: 'Router', parameters: { name: 'Main' } } : { id: 'router', type: 'Router' };
    await call('create_component', { path: '/App', nodes: [router], connections: [] });
    await call('create_component', { path: '/Pages/Olive', ...page('olive', 'Olive') });
    await call('create_component', { path: '/Pages/Robot', ...page('robot', 'Robot') });
    await call('set_project_settings', { home: '/App' });
  } finally {
    await client.close();
    await server.close();
  }
}

function deploy(project: string, site: string): number {
  fs.rmSync(site, { recursive: true, force: true });
  try {
    execFileSync('node', [path.join(REPO, 'node_modules', '.bin', 'nodegx'), 'deploy', project, site, '--allow-development-engine'], { stdio: 'pipe' });
    return 0;
  } catch (e) {
    return (e as { status?: number }).status ?? 1;
  }
}

type Page = { navigate(u: string): Promise<void>; evaluate(e: string): Promise<unknown>; consoleErrors: string[] };

(async () => {
  const project = path.join(WORK, 'project');
  const site = path.join(WORK, 'site');
  await author(project);
  const app = JSON.parse(fs.readFileSync(path.join(project, 'components', 'App', 'nodes.json'), 'utf8')) as { nodes: Array<{ type: string; parameters?: Record<string, unknown> }> };
  const saved = app.nodes.find((n) => n.type === 'Router');
  const savedName = saved?.parameters?.name;
  check(`the saved Router ${NAMED ? 'is named Main' : 'has no name'}`, !!saved && (NAMED ? savedName === 'Main' : savedName === undefined), saved);

  const code = deploy(project, site);
  check('nodegx deploy exits 0', code === 0, code);
  if (code === 0) {
    const got = await withDeployedSite({ dir: site }, async (p: Page) => {
      const read = async (slug: string) => {
        await p.navigate('/' + slug);
        for (let i = 0; i < 40; i++) {
          const text = (await p.evaluate(`(() => { const e = document.querySelector('[data-isl034]'); return e ? e.getAttribute('data-isl034') : null; })()`)) as string | null;
          if (text) return text;
          await new Promise((r) => setTimeout(r, 150));
        }
        return null;
      };
      const robot = await read('robot');
      const routers = await p.evaluate(`JSON.stringify(window.projectData && window.projectData.routerIndex && window.projectData.routerIndex.routers)`);
      const olive = await read('olive');
      return { robot, olive, routers, consoleErrors: p.consoleErrors.slice() };
    });
    check('the deployed index lists the Router, as Main', /"name":"Main"/.test(String(got.routers)), got.routers);
    check('/robot shows the Robot page', got.robot === 'robot', got.robot);
    check('/olive shows the Olive page', got.olive === 'olive', got.olive);
    check('no console error', got.consoleErrors.length === 0, got.consoleErrors);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});
