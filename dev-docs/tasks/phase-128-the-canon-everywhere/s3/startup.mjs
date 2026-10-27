// P128 S3 — what a .mcpb's server hands a `claude-ai` client at start: the briefing's length, the tools, the
// list_changed notifications in the first 1.5 s. node startup.mjs <unpacked .mcpb dir> <empty HOME dir>
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path';
const [unpacked, home] = process.argv.slice(2);
const req = createRequire(new URL('../../../../package.json', import.meta.url));
const { Client } = await import(req.resolve('@modelcontextprotocol/sdk/client/index.js'));
const { StdioClientTransport } = await import(req.resolve('@modelcontextprotocol/sdk/client/stdio.js'));
const { ToolListChangedNotificationSchema } = await import(req.resolve('@modelcontextprotocol/sdk/types.js'));
const m = JSON.parse(fs.readFileSync(path.join(unpacked, 'manifest.json'), 'utf8'));
const sub = (s) => s.replaceAll('${__dirname}', unpacked);
const env = { HOME: home, PATH: '/usr/bin:/bin', NODEGX_STUDIO_NO_OPEN: '1' };
for (const [k, v] of Object.entries(m.server.mcp_config.env)) env[k] = sub(v);
const t = new StdioClientTransport({ command: process.execPath, args: m.server.mcp_config.args.map(sub), env, stderr: 'pipe' });
const c = new Client({ name: 'claude-ai', version: '0.1.0' }, { capabilities: { extensions: { 'io.modelcontextprotocol/ui': { mimeTypes: ['text/html;profile=mcp-app'] } } } });
let changed = 0; c.setNotificationHandler(ToolListChangedNotificationSchema, () => { changed++; });
await c.connect(t);
const instr = c.getInstructions() ?? '';
const tools = (await c.listTools()).tools;
await new Promise((r) => setTimeout(r, 1500));
const json = JSON.stringify(tools);
console.log(`${m.version}: instructions ${instr.length} chars; tools ${tools.length}, ${json.length} chars JSON; list_changed in first 1.5 s: ${changed}`);
console.log('  instructions start: ' + instr.slice(0, 260).replace(/\s+/g, ' '));
const big = tools.map((x) => [x.name, JSON.stringify(x).length]).sort((a, b) => b[1] - a[1]).slice(0, 3);
console.log('  largest: ' + big.map(([n, l]) => `${n} ${l}`).join(', '));
await c.close();
