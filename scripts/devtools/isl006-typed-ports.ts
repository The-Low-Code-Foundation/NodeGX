/**
 * P109 ISL-006 AC2 + AC3 — a Function's written port list, read on a deployed page.
 *
 * Builds a one-page app through the door, deploys it with `nodegx deploy`, and reads four Texts in a browser. One
 * Function writes four outputs. Three are on its written list (`scriptOutputs`): `declared` typed object, `num` typed
 * number, and `fromKey` typed string, which the code reaches only as `Outputs[k]`, so only the list makes that port.
 * `loose` is the same kind of object, named only by the code (`*`).
 *
 * Expected: `declared` shows JSON (NDA-014's contract for a typed output), `num` shows 42, `fromKey` shows "by key",
 * and `loose` shows what an untyped object shows (recorded, not asserted). The refusal arm: a wire from `out-ghost`,
 * on neither the list nor in the code, is refused at write time with the name.
 *
 * Usage: npx ts-node -P scripts/tsconfig.json scripts/devtools/isl006-typed-ports.ts <work-dir> [--json <file>]
 * Exits 0 when every check passes, 1 when one fails, 2 on a usage error.
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
  console.error('usage: isl006-typed-ports.ts <work-dir> [--json <file>]');
  process.exit(2);
}

const results: Array<{ name: string; ok: boolean; saw: unknown }> = [];
const check = (name: string, ok: boolean, saw: unknown) => {
  results.push({ name, ok, saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${JSON.stringify(saw)}`}`);
};

const SCRIPT = [
  "Outputs.declared = { kind: 'declared', n: 1 };",
  "Outputs.loose = { kind: 'loose', n: 2 };",
  'Outputs.num = 41 + 1;',
  "for (const k of ['fromKey']) Outputs[k] = 'by key';"
].join('\n');

const text = (id: string) => ({ id: `t_${id}`, type: 'Text', parent: 'root', parameters: { text: '', dataAttributes: 'data-isl006', 'data-isl006': id } });
const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string) => ({ fromId, fromProperty, toId, toProperty });

async function author(dir: string): Promise<{ refusal: { isError: boolean; text: string } }> {
  process.env.NODEGX_RENDER_DISABLED = '1';
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'components'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'nodegx.project.json'),
    JSON.stringify({ name: 'ISL-006 typed ports', version: '5', nodegxVersion: '1.1.0', settings: { navigationPathType: 'path' }, structure: { componentsDir: 'components', assetsDir: 'assets' } }, null, 2)
  );
  fs.writeFileSync(
    path.join(dir, 'components', '_registry.json'),
    JSON.stringify({ version: 1, lastUpdated: '2026-10-05T00:00:00.000Z', components: {}, stats: { totalComponents: 0, totalNodes: 0, totalConnections: 0 } }, null, 2)
  );
  const { server } = createServer({ projectDir: dir, allowWrites: true });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'isl006-typed-ports', version: '0.0.0' });
  await Promise.all([server.connect(b), client.connect(a)]);
  const raw = async (name: string, args: Record<string, unknown>) =>
    (await client.callTool({ name, arguments: args })) as { isError?: boolean; content?: Array<{ text: string }> };
  const call = async (name: string, args: Record<string, unknown>) => {
    const res = await raw(name, args);
    if (res.isError) throw new Error(`${name} refused: ${res.content?.[0]?.text}`);
    return res;
  };
  try {
    await call('find_tools', { group: 'project' });
    await call('create_component', { path: '/App', nodes: [{ id: 'router', type: 'Router', parameters: { name: 'Main' } }], connections: [] });
    await call('create_component', {
      path: '/Pages/Home',
      nodes: [
        { id: 'page', type: 'Page', parameters: { title: 'Home', urlPath: '' } },
        { id: 'root', type: 'Group', parent: 'page', parameters: { flexDirection: 'column' } },
        text('declared'),
        text('loose'),
        text('num'),
        text('fromKey'),
        {
          id: 'fn',
          type: 'JavaScriptFunction',
          label: 'Four outputs',
          parameters: {
            functionScript: SCRIPT,
            scriptOutputs: [
              { id: 'declared', label: 'declared' },
              { id: 'num', label: 'num' },
              { id: 'fromKey', label: 'fromKey' }
            ],
            'outtype-declared': 'object',
            'outtype-num': 'number',
            'outtype-fromKey': 'string'
          }
        }
      ],
      connections: [
        wire('fn', 'out-declared', 't_declared', 'text'),
        wire('fn', 'out-loose', 't_loose', 'text'),
        wire('fn', 'out-num', 't_num', 'text'),
        wire('fn', 'out-fromKey', 't_fromKey', 'text')
      ]
    });
    await call('set_project_settings', { home: '/App' });
    const refused = await raw('update_component', {
      path: '/Pages/Home',
      operations: [{ op: 'add_connection', connection: wire('fn', 'out-ghost', 't_num', 'text') }]
    });
    return { refusal: { isError: refused.isError === true, text: refused.content?.[0]?.text ?? '' } };
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

(async () => {
  const project = path.join(WORK, 'project');
  const site = path.join(WORK, 'site');
  const { refusal } = await author(project);
  check('a wire from out-ghost is refused at write time, by name', refusal.isError && refusal.text.includes('unknown-function-port') && refusal.text.includes('out-ghost'), refusal.text.slice(0, 400));

  const fnNode = JSON.parse(fs.readFileSync(path.join(project, 'components', 'Pages', 'Home', 'nodes.json'), 'utf8')).nodes.find((n: { type: string }) => n.type === 'JavaScriptFunction');
  const outs = (fnNode.ports ?? []).filter((p: { plug: string }) => p.plug === 'output').map((p: { name: string; type: unknown }) => `${p.name}:${p.type}`).sort();
  check('the written node has the three listed outputs typed and the code-only one untyped', JSON.stringify(outs) === JSON.stringify(['out-declared:object', 'out-fromKey:string', 'out-loose:*', 'out-num:number']), outs);

  const code = deploy(project, site);
  check('nodegx deploy exits 0', code === 0, code);
  if (code === 0) {
    const read = (await withDeployedSite({ dir: site }, async (p: { evaluate(e: string): Promise<unknown>; consoleErrors: string[] }) => {
      for (let i = 0; i < 40; i++) {
        const got = (await p.evaluate(
          `(() => { const o = {}; for (const e of document.querySelectorAll('[data-isl006]')) o[e.getAttribute('data-isl006')] = e.innerText; return o; })()`
        )) as Record<string, string>;
        if (got.num) return { ...got, consoleErrors: p.consoleErrors.slice() };
        await new Promise((r) => setTimeout(r, 150));
      }
      return { consoleErrors: p.consoleErrors.slice() };
    })) as Record<string, unknown>;
    console.log('screen:', JSON.stringify(read));
    check('the declared object output shows JSON', read.declared === '{"kind":"declared","n":1}', read.declared);
    check('the declared number output shows 42', read.num === '42', read.num);
    check('the output the code reaches only as Outputs[k] arrives through the list', read.fromKey === 'by key', read.fromKey);
    check('no console errors', Array.isArray(read.consoleErrors) && read.consoleErrors.length === 0, read.consoleErrors);
    results.push({ name: 'RECORD: the same object, not on the list, shows', ok: true, saw: read.loose });
    console.log(`RECORD  the same object, not on the list, shows: ${JSON.stringify(read.loose)}`);
  }
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(results, null, 2));
  process.exit(results.every((r) => r.ok) ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
