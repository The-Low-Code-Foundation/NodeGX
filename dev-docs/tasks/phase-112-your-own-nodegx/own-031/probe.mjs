// OWN-031 — build_app as a client meets it: stdio, one call, the server asking the local model. No chat model here:
// this measures the server's half (questions, seconds, the page), which is the same whichever host makes the call.
//
//   node probe.mjs --brief bakery [--bundle dist/noodl-mcp-own031.cjs] [--model gemma4-e4b-32k] [--out <dir>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
// OWN-029's six briefs (agent.mjs runs on import, so they are copied, not imported)
const BRIEFS = {
  puppy: 'Make me a puppy adoption landing page please, blue colour theme, modern style.',
  bakery: 'A one-page site for our family bakery in Lyon. Warm colours. We sell sourdough, croissants and cakes, open Tuesday to Sunday.',
  running: 'A sign-up page for a Saturday morning running club in the park. Energetic, green.',
  jazz: 'A page for a jazz evening on 14 November at The Blue Room: the line-up, tickets and how to get there. Dark and elegant.',
  pottery: 'A portfolio page for a potter who sells handmade bowls and teaches weekend classes. Minimal, lots of white space.',
  plumber: 'A simple page for my plumbing business so customers can ask for a call-back. Trustworthy, blue.'
};

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../../..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const brief = opt('--brief', 'bakery');
const request = opt('--request') || BRIEFS[brief];
const bundle = path.resolve(REPO, 'packages/noodl-mcp', opt('--bundle', 'dist/noodl-mcp-own031.cjs'));
const out = path.resolve(opt('--out', path.join(HERE, 'runs')));
const projects = path.join(out, 'projects');
fs.mkdirSync(projects, { recursive: true });

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [bundle, '--allow-writes'],
  env: { ...process.env, NODEGX_LOCAL_MODEL: opt('--model', 'gemma4-e4b-32k'), NODEGX_PROJECTS_DIR: projects, NODEGX_KNOWN_PROJECTS: path.join(projects, '.known.json'), ...(argv.includes('--render') ? {} : { NODEGX_RENDER_DISABLED: '1' }) },
  stderr: 'pipe'
});
const stderr = [];
transport.stderr?.on('data', (d) => stderr.push(String(d)));
const client = new Client({ name: 'own031-probe', version: '0.1.0' }, { capabilities: {} });
await client.connect(transport);
const t0 = Date.now();
const progress = [];
const r = await client.callTool({ name: 'build_app', arguments: { request } }, undefined, {
  timeout: 300_000, resetTimeoutOnProgress: true, maxTotalTimeout: 1_800_000,
  onprogress: (p) => { progress.push([Math.round((Date.now() - t0) / 1000), p.message]); process.stdout.write(`  ${Math.round((Date.now() - t0) / 1000)}s ${p.message}\n`); }
});
const text = (r.content || []).map((c) => c.text || '').join('\n');
let json = null; try { json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)); } catch {}
const row = { brief, request, isError: !!r.isError, seconds: Math.round((Date.now() - t0) / 1000), progress, result: json || text.slice(0, 3000), stderrTail: stderr.join('').slice(-1500) };
fs.writeFileSync(path.join(out, `${brief}-${Date.now()}.json`), JSON.stringify(row, null, 1));
console.log(JSON.stringify({ ...row, progress: progress.length, stderrTail: undefined }, null, 1).slice(0, 4000));
await client.close();
