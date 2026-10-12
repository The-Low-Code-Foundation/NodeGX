#!/usr/bin/env node
/**
 * P112 OWN-014 — `render_report` as a stranger's agent calls it: the MCP from a tarball (or the registry), in an empty
 * folder, `HOME` empty, spoken to over stdio.
 *
 *   node scripts/own/stranger-render.mjs <mcp>            <mcp> = a path to an @nodegx/mcp .tgz, or a registry spec
 *                                                          such as @nodegx/mcp@0.1.0
 *   node scripts/own/stranger-render.mjs <mcp> --plant    also plant a defect a person would see, and render again
 *
 * The server is the one `npm create nodegx` registers (`npx -y <mcp> --allow-writes`), started with every override that
 * could point it back into this checkout removed, under a folder with no `node_modules` above it. It makes a project
 * with `create_project`, then calls `render_report` on it. Prints one JSON line per step; exit 1 if `render_report`
 * did not answer with a render (exit 0 for a refusal only with `--expect-refusal`, the control arm).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const mcpRequire = createRequire(path.join(here, '..', '..', 'packages', 'noodl-mcp', 'package.json'));
const { Client } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/index.js'));
const { StdioClientTransport } = await import(mcpRequire.resolve('@modelcontextprotocol/sdk/client/stdio.js'));

const args = process.argv.slice(2);
const spec = args.find((a) => !a.startsWith('--'));
const plant = args.includes('--plant');
const expectRefusal = args.includes('--expect-refusal');
if (!spec) {
  console.error('usage: stranger-render.mjs <mcp .tgz | registry spec> [--plant] [--expect-refusal]');
  process.exit(2);
}
const mcp = fs.existsSync(spec) ? path.resolve(spec) : spec;

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'stranger-render-'));
const home = path.join(work, 'home');
const apps = path.join(work, 'my-apps');
fs.mkdirSync(home);
fs.mkdirSync(apps);
const env = { ...process.env, HOME: home, npm_config_cache: path.join(home, '.npm') };
for (const k of ['NODEGX_RENDER_CLI', 'NODEGX_DRIVE_CLI', 'NODEGX_BACKEND_ENTRY', 'NODEGX_DEPLOY_CLI', 'NODE_PATH']) delete env[k];

const say = (step, data) => console.log(JSON.stringify({ step, ...data }));
say('folder', { work, mcp });

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', '--package', mcp, 'noodl-mcp', '--allow-writes'],
  cwd: apps,
  env,
  stderr: 'pipe'
});
let serverLog = '';
transport.stderr?.on('data', (d) => (serverLog += d));
const client = new Client({ name: 'stranger-render', version: '1.0.0' });
await client.connect(transport);

const text = (r) => (r.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
const tools = async () => (await client.listTools()).tools.map((t) => t.name);

say('bootstrap', { tools: await tools() });
const projectDir = path.join(apps, 'lingo');
const made = await client.callTool({
  name: 'create_project',
  arguments: {
    directory: projectDir,
    name: 'Lingo',
    request: 'A Duolingo-style app: short lessons, each word spoken aloud.',
    pages: [{ name: 'Home', purpose: 'Pick a lesson.' }],
    agreed: true
  }
});
say('create_project', { isError: !!made.isError, text: text(made).slice(0, 300) });
const bound = await tools();
say('bound', { hasRenderReport: bound.includes('render_report'), count: bound.length });

const render = async (label) => {
  const r = await client.callTool({ name: 'render_report', arguments: { viewports: 'phone', screenshot: 'none' } });
  const body = text(r);
  const saved = path.join(work, `${label.replace(/\W+/g, '-')}.txt`);
  fs.writeFileSync(saved, body);
  say(label, { isError: !!r.isError, chars: body.length, saved, head: body.split('\n')[0] });
  return r;
};

const first = await render('render_report');
let failed = expectRefusal ? !first.isError : !!first.isError;

if (plant && !first.isError) {
  // A defect a person sees at once on a phone: a line of text far wider than the screen, in the page's root.
  const { planted, where } = plantWideText(projectDir);
  say('plant', { planted, where });
  const second = await render('render_report after plant');
  if (second.isError) failed = true;
}

await client.close();
if (failed) say('server-stderr', { tail: serverLog.slice(-2000) });
process.exit(failed ? 1 : 0);

/** Put a 3000px-wide Text under the Home page's root visual node. Returns what it did. */
function plantWideText(dir) {
  const compsRoot = path.join(dir, 'components');
  const homeDir = fs
    .readdirSync(compsRoot, { recursive: true })
    .map((p) => path.join(compsRoot, String(p)))
    .find((p) => p.endsWith(`${path.sep}nodes.json`) && /home/i.test(p));
  if (!homeDir) return { planted: false, where: 'no Home nodes.json' };
  const nodes = JSON.parse(fs.readFileSync(homeDir, 'utf8'));
  const list = Array.isArray(nodes) ? nodes : nodes.nodes;
  const parent = list.find((n) => n.type === 'Group' || n.type === 'net.noodl.visual.group') || list.find((n) => !n.parent);
  const id = 'planted-wide-text';
  list.push({
    id,
    type: 'Text',
    label: 'Planted wide text',
    parameters: { text: 'THIS LINE IS FAR WIDER THAN ANY PHONE '.repeat(8), width: { value: 3000, unit: 'px' }, sizeMode: 'contentHeight' },
    parent: parent ? parent.id : undefined,
    children: []
  });
  if (parent) parent.children = [...(parent.children || []), id];
  fs.writeFileSync(homeDir, JSON.stringify(nodes, null, 2) + '\n');
  return { planted: true, where: path.relative(dir, homeDir) };
}

