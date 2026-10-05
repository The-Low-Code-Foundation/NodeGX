/**
 * P109 ISL-005 AC2 — the person sentence, in a browser: a helper written once, used by a Function on each of two pages.
 * Change the helper's file only, deploy, and both pages show the new behaviour; change it back, and both revert.
 *
 *     ts-node -T -P ./scripts/tsconfig.json ./scripts/devtools/isl005-two-pages.ts <work-dir> [--json <file>]
 *
 * The project is authored through the real door (`createServer`, in-process, the way `npm run template:garden` builds
 * the garden): `write_script_file` for `scripts/engine/greet.js` (which `use()`s `scripts/engine/words.js`), then a
 * page each with a Function (Uses: `engine/greet.js`) feeding a Text. Each round is `nodegx deploy` (gated on its exit
 * code) and a headless Chrome reading both pages' text from the deployed site. Round 2 rewrites `words.js` on disk, a
 * file neither Function lists; round 3 puts it back.
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
const JSON_OUT = process.argv.indexOf('--json') > 0 ? process.argv[process.argv.indexOf('--json') + 1] : null;
if (!WORK || WORK.startsWith('--')) {
  console.error('usage: isl005-two-pages.ts <work-dir> [--json <file>]');
  process.exit(2);
}

const GREET = "var words = use('engine/words');\n\nexports.hello = function (name) {\n  return words.hi + ', ' + name + '!';\n};\n";
const WORDS = (hi: string) => `exports.hi = ${JSON.stringify(hi)};\n`;

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
      { name: 'ISL-005 two pages', version: '4', nodegxVersion: '1.1.0', settings: { navigationPathType: 'path' }, structure: { componentsDir: 'components', assetsDir: 'assets' } },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(dir, 'components', '_registry.json'),
    JSON.stringify({ version: 1, lastUpdated: '2026-10-05T00:00:00.000Z', components: {}, stats: { totalComponents: 0, totalNodes: 0, totalConnections: 0 } }, null, 2)
  );
}

const page = (slug: string, name: string) => ({
  nodes: [
    { id: `${slug}Page`, type: 'Page', parameters: { title: name, urlPath: slug } },
    { id: `${slug}Line`, type: 'Text', parent: `${slug}Page`, parameters: { text: '', dataAttributes: 'data-isl005', 'data-isl005': slug } },
    { id: `${slug}Fn`, type: 'JavaScriptFunction', parameters: { functionScript: `Outputs.line = Scripts.greet.hello(${JSON.stringify(name)});`, uses: 'engine/greet.js' } }
  ],
  connections: [{ fromId: `${slug}Fn`, fromProperty: 'out-line', toId: `${slug}Line`, toProperty: 'text' }]
});

async function author(dir: string): Promise<void> {
  process.env.NODEGX_RENDER_DISABLED = '1';
  skeleton(dir);
  const { server } = createServer({ projectDir: dir, allowWrites: true });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'isl005-two-pages', version: '0.0.0' });
  await Promise.all([server.connect(b), client.connect(a)]);
  const call = async (name: string, args: Record<string, unknown>) => {
    const res = (await client.callTool({ name, arguments: args })) as { isError?: boolean; content?: Array<{ text: string }> };
    if (res.isError) throw new Error(`${name} refused: ${res.content?.[0]?.text}`);
    return res;
  };
  try {
    await call('find_tools', { group: 'project' });
    await call('write_script_file', { path: 'engine/words.js', content: WORDS('Hello') });
    await call('write_script_file', { path: 'engine/greet.js', content: GREET });
    await call('create_component', { path: '/App', nodes: [{ id: 'router', type: 'Router', parameters: { name: 'Main' } }], connections: [] });
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

async function readPages(site: string): Promise<{ olive: string | null; robot: string | null; consoleErrors: string[] }> {
  return withDeployedSite({ dir: site }, async (p: { navigate(u: string): Promise<void>; evaluate(e: string): Promise<unknown>; consoleErrors: string[] }) => {
    const read = async (slug: string) => {
      await p.navigate('/' + slug);
      for (let i = 0; i < 40; i++) {
        const text = (await p.evaluate(`(() => { const e = document.querySelector('[data-isl005="${slug}"]'); return e ? e.innerText : null; })()`)) as string | null;
        if (text) return text;
        await new Promise((r) => setTimeout(r, 150));
      }
      return null;
    };
    return { olive: await read('olive'), robot: await read('robot'), consoleErrors: p.consoleErrors.slice() };
  });
}

(async () => {
  const project = path.join(WORK, 'project');
  const site = path.join(WORK, 'site');
  await author(project);
  check('the project holds the two files and no copy of them in a Function', fs.existsSync(path.join(project, 'scripts', 'engine', 'greet.js')) && fs.existsSync(path.join(project, 'scripts', 'engine', 'words.js')), fs.readdirSync(path.join(project, 'scripts', 'engine')));

  const rounds: Array<{ label: string; hi: string }> = [
    { label: 'as written', hi: 'Hello' },
    { label: 'words.js changed only', hi: 'Hi there' },
    { label: 'changed back', hi: 'Hello' }
  ];
  const readings: unknown[] = [];
  for (const round of rounds) {
    fs.writeFileSync(path.join(project, 'scripts', 'engine', 'words.js'), WORDS(round.hi));
    const code = deploy(project, site);
    check(`${round.label}: nodegx deploy exits 0`, code === 0, code);
    if (code !== 0) continue;
    const got = await readPages(site);
    readings.push({ round: round.label, ...got });
    check(`${round.label}: the Olive page says "${round.hi}, Olive!"`, got.olive === `${round.hi}, Olive!`, got.olive);
    check(`${round.label}: the Robot page says "${round.hi}, Robot!"`, got.robot === `${round.hi}, Robot!`, got.robot);
    check(`${round.label}: no console error`, got.consoleErrors.length === 0, got.consoleErrors);
  }
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ results, readings }, null, 1));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});
