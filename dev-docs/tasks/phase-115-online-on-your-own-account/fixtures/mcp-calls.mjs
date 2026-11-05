// P115 HST-002: the MCP door for a fixture whose session's own MCP connection is bound elsewhere (a server binds once).
// Runs this checkout's noodl-mcp (the build Claude Desktop's .mcp.json names) over stdio with the SDK's own Client,
// against one project, and makes the calls listed in a JSON file: [{ "tool": "...", "args": { ... } }, ...].
// Every call and its answer is appended to <project>/../<name>.mcp-log.jsonl, so the fixture's authoring is on record.
//
//   node mcp-calls.mjs <projectDir> <calls.json>        (or "-" to list the tools)
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../..');
const [projectDir, callsFile] = process.argv.slice(2);
if (!projectDir || !callsFile) {
  console.error('usage: node mcp-calls.mjs <projectDir> <calls.json | ->');
  process.exit(2);
}
const electron = path.join(repo, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');
const transport = new StdioClientTransport({
  command: electron,
  args: [path.join(repo, 'packages/noodl-mcp/dist/noodl-mcp.cjs'), path.resolve(projectDir), '--allow-writes', '--screenshots-to-files'],
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  stderr: 'pipe'
});
const client = new Client({ name: 'p115-fixture', version: '0.1.0' }, { capabilities: {} });
await client.connect(transport);
const accountsFile = path.join(projectDir, '.accounts.json');
const secrets = fs.existsSync(accountsFile)
  ? Object.values(JSON.parse(fs.readFileSync(accountsFile, 'utf8'))).map((a) => a.password).filter(Boolean)
  : [];
const log = path.join(path.dirname(path.resolve(projectDir)), `${path.basename(projectDir)}.mcp-log.jsonl`);

try {
  if (callsFile === '-') {
    for (const t of (await client.listTools()).tools) console.log(t.name);
  } else if (callsFile.startsWith('schema:')) {
    // schema:<tool>[,<find_tools query>]: reveal, then print one tool's input schema
    const [name, query] = callsFile.slice(7).split(',');
    if (query) await client.callTool({ name: 'find_tools', arguments: { query } });
    const t = (await client.listTools()).tools.find((x) => x.name === name);
    console.log(t ? JSON.stringify({ description: t.description, inputSchema: t.inputSchema }, null, 1) : `no tool ${name}`);
  } else {
    const calls = JSON.parse(fs.readFileSync(callsFile, 'utf8'));
    // `{ "tool": "__http", "args": { method, path, body }, "save": "x" }` is not an MCP call: it sends one request to
    // the backend this project is bound to (its cloudservices endpoint), the way a page would, for what no tool does
    // (a user signing up). A later call's args may say `${x.field}` to use what it answered.
    const saved = {};
    const fill = (v) => JSON.parse(JSON.stringify(v).replace(/\$\{(\w+)\.(\w+)\}/g, (_, k, f) => saved[k]?.[f] ?? ''));
    for (const [i, call] of calls.entries()) {
      const { tool, save } = call;
      const args = fill(call.args ?? {});
      const t = Date.now();
      let r;
      if (tool === '__http') {
        const proj = JSON.parse(fs.readFileSync(path.join(projectDir, 'nodegx.project.json'), 'utf8'));
        const cs = proj.metadata?.cloudservices ?? {};
        const res = await fetch(cs.endpoint + args.path, {
          method: args.method ?? 'GET',
          headers: { 'content-type': 'application/json', 'x-parse-application-id': cs.appId ?? '', ...(args.headers ?? {}) },
          body: args.body ? JSON.stringify(args.body) : undefined
        });
        const body = await res.text();
        r = { isError: !res.ok, content: [{ type: 'text', text: `${res.status} ${body}` }] };
        try { if (save) saved[save] = JSON.parse(body); } catch {}
      } else {
        r = await client.callTool({ name: tool, arguments: args }, undefined, { timeout: 600000 });
        if (save) try { saved[save] = JSON.parse(r.content?.[0]?.text ?? ''); } catch {}
      }
      const text = (r.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
      // The log is committed: the fixture's test passwords (<project>/.accounts.json, gitignored) and any session token never reach it.
      let line = JSON.stringify({ at: new Date().toISOString(), tool, args, isError: !!r.isError, ms: Date.now() - t, text });
      for (const pw of secrets) line = line.split(pw).join('«password»');
      line = line.replace(/(sessionToken\\?"\s*:\s*\\?")[^"\\]+/g, '$1«token»');
      line = line.replace(/(x-parse-session-token\\?"\s*:\s*\\?")[^"\\]+/g, '$1«token»');
      fs.appendFileSync(log, line + '\n');
      console.log(`=== ${tool}${r.isError ? ' (ERROR)' : ''} ${Date.now() - t} ms`);
      if (process.env.OUT) {
        // one file per answer, for answers too long to read in a terminal
        fs.mkdirSync(process.env.OUT, { recursive: true });
        const f = path.join(process.env.OUT, `${i}-${tool}.txt`);
        fs.writeFileSync(f, text);
        console.log(`(${text.length} chars → ${f})`);
      } else console.log(text);
      if (r.isError && !process.env.CONTINUE) break;
    }
  }
} finally {
  await client.close().catch(() => {});
}
