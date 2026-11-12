// OWN-031 — render a built project and keep its shots: render_report through the same bundle, bound to the project.
//   node render.mjs <projectDir> [--bundle dist/noodl-mcp-own031.cjs]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../../..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const dir = path.resolve(argv[0]);
const bundle = path.resolve(REPO, 'packages/noodl-mcp', opt('--bundle', 'dist/noodl-mcp-own031.cjs'));
const transport = new StdioClientTransport({ command: process.execPath, args: [bundle, dir], env: { ...process.env }, stderr: 'pipe' });
const client = new Client({ name: 'own031-render', version: '0.1.0' }, { capabilities: {} });
await client.connect(transport);
const r = await client.callTool({ name: 'render_report', arguments: { out_dir: '.previews/shots', viewports: 'desktop,phone', scale: 0.5 } }, undefined, { timeout: 300000 });
const text = (r.content || []).map((c) => c.text || '').join('\n');
const i = text.indexOf('{'), h = text.indexOf('HONESTY');
let rep = null; try { rep = JSON.parse(text.slice(i, text.lastIndexOf('}', h > 0 ? h : undefined) + 1)); } catch {}
console.log(JSON.stringify({ isError: !!r.isError, summary: rep?.summary, findings: (rep?.findings || []).map((f) => `${f.code || f.kind}: ${String(f.message || '').slice(0, 140)}`) }, null, 1).slice(0, 5000));
if (!rep) console.log(text.slice(0, 1500));
await client.close();
