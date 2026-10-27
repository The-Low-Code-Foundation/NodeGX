// P128 S3 — drive an UNPACKED .mcpb the way Claude Desktop starts it: the manifest's command, args and env, a fresh
// HOME, PATH /usr/bin:/bin, a client named `claude-ai` that declares the UI extension. Prints initialize, open_project,
// open_studio (+ a GET of Studio), render_report and, with BACKEND=1, provision_backend.
//   PRELOAD=dev-docs/tasks/phase-128-the-canon-everywhere/s3/as-desktop.cjs  stand where Desktop stands (execPath refuses)
//   node drive-mcpb.mjs <unpacked .mcpb dir> <empty HOME dir> <a project copy, e.g. of templates/todo-list>
// The control is the 0.2.7 bundle: under PRELOAD its open_studio, render_report and provision_backend fail on exit 64.
// Drive the unpacked .mcpb the way Claude Desktop starts it: its manifest's command, args and env, a fresh HOME.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const [unpacked, home, project] = process.argv.slice(2);
const req = createRequire(new URL('../../../../package.json', import.meta.url));
const { Client } = await import(req.resolve('@modelcontextprotocol/sdk/client/index.js'));
const { StdioClientTransport } = await import(req.resolve('@modelcontextprotocol/sdk/client/stdio.js'));
const m = JSON.parse(fs.readFileSync(path.join(unpacked, 'manifest.json'), 'utf8'));
const sub = (s) => s.replaceAll('${__dirname}', unpacked);
const env = { HOME: home, PATH: '/usr/bin:/bin', NODEGX_STUDIO_NO_OPEN: '1' };
for (const [k, v] of Object.entries(m.server.mcp_config.env)) env[k] = sub(v);
const t0 = Date.now(); const ms = () => `${Date.now() - t0} ms`;
const transport = new StdioClientTransport({ command: process.execPath, args: [...(process.env.PRELOAD ? ['-r', process.env.PRELOAD] : []), ...m.server.mcp_config.args.map(sub)], env, stderr: 'pipe' });
let errText = ''; transport.stderr?.on('data', (d) => (errText += d));
const client = new Client({ name: 'claude-ai', version: '0.1.0' }, { capabilities: { extensions: { 'io.modelcontextprotocol/ui': { mimeTypes: ['text/html;profile=mcp-app'] } } } });
const text = (r) => r.content?.map((c) => c.text ?? '').join('\n') ?? '';
try {
  await client.connect(transport);
  console.log(`initialize: ${ms()}, server ${JSON.stringify(client.getServerVersion())}`);
  console.log(`tools (unbound): ${(await client.listTools()).tools.map((t) => t.name).join(', ')}`);
  const open = await client.callTool({ name: 'open_project', arguments: { directory: project } });
  console.log(`open_project: isError=${!!open.isError} ${ms()}`);
  console.log(`tools (bound): ${(await client.listTools()).tools.length}`);
  const studio = await client.callTool({ name: 'open_studio', arguments: {} });
  const s = text(studio);
  const url = /http:\/\/127\.0\.0\.1:\d+\/?/.exec(s)?.[0];
  console.log(`open_studio: isError=${!!studio.isError} url=${url} ${ms()}`);
  if (url) {
    const r = await fetch(url);
    const body = await r.text();
    console.log(`GET ${url}: ${r.status}, ${body.length} chars, <title>${/<title>([^<]*)/.exec(body)?.[1]}</title>`);
  } else console.log(s.slice(0, 600));
  const rr = await client.callTool({ name: 'render_report', arguments: {} });
  const rt = text(rr);
  console.log(`render_report: isError=${!!rr.isError} ${ms()} :: ${rt.replace(/\s+/g, ' ').slice(0, 220)}`);
  if (process.env.BACKEND) {
    await client.callTool({ name: 'find_tools', arguments: { group: 'backend' } });
    const pb = await client.callTool({ name: 'provision_backend', arguments: { name: 'Desktop standin', collections: [{ name: 'Task', columns: [{ name: 'title', type: 'String' }] }] } });
    console.log(`provision_backend: isError=${!!pb.isError} ${ms()} :: ${text(pb).replace(/\s+/g, ' ').slice(0, 260)}`);
  }
  const res = await client.readResource({ uri: 'ui://nodegx/studio.html' });
  console.log(`ui://nodegx/studio.html: ${res.contents?.[0]?.text?.length ?? 0} chars`);
} catch (e) {
  console.log(`FAILED: ${e.message}`);
} finally {
  await client.close();
  if (/Error|error/.test(errText)) console.log(`stderr (errors):\n${errText.split('\n').filter((l) => /rror/.test(l)).slice(0, 8).join('\n')}`);
}
