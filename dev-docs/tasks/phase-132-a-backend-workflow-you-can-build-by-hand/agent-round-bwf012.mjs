// P132 BWF-012 AC3: one agent, one request, on a copy of Greenhouse through the checkout's MCP server. BWF-005's round
// (agent-round-bwf005.mjs) with this lab: `node agent-round-bwf012.mjs <labRoot> --setup` copies Greenhouse to
// `<labRoot>/lab/Greenhouse`, ADDS a saved API call `weather` to its `nodegx.automations.json` (the city a blank, the key
// the Secret WEATHER_KEY) and no workflow that uses it, starts Studio's serve.mjs on it with NODEGX_REPO and
// NODEGX_BACKENDS_DIR=<labRoot>/backends (pid in <labRoot>/serve.pid: kill it after), so the backend is seeded with the
// call, and sets WEATHER_KEY. Then `node agent-round-bwf012.mjs <labRoot>`; `--grade` reads the file afterwards: a new
// workflow whose http-request step says `call: "weather"` and fills `city`, with no address, header or key copied.
// The agent: a fresh `claude -p` on Opus (`opus` alias), the nodegx server alone (`packages/noodl-mcp/bin`, its dist
// rebuilt first), file tools fenced to the copy. Run under nohup with the Bash sandbox off.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const REPO = '/Users/richardosborne/vscode_projects/OpenNoodl';
const [labRoot, round = 'asked'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!labRoot) throw new Error('usage: agent-round-bwf012.mjs <labRoot> [asked] [--setup|--grade]');
const GH = path.join(labRoot, 'lab', 'Greenhouse');
const OUT = path.join(labRoot, `out-${round}`);

// the person's words, AC3's as the task wrote it ("use the weather call in a new workflow"), said as a change (s5: a
// question builds nothing), with what the workflow is for so there is something to build
const PROMPTS = {
  asked: 'Use the weather call in a new workflow: every morning at 7, get the weather in Lyon.'
};
const CALL = {
  id: 'weather',
  name: 'The weather in a city',
  description: 'The current weather for a city, from the weather service',
  params: { url: 'https://api.example.com/v1/current', query: { city: { $path: 'fill.city' }, units: 'metric' }, authType: 'header', authName: 'X-API-Key', authSecret: 'WEATHER_KEY' },
  blanks: [{ name: 'city', type: 'text', example: 'Paris', description: 'The city to ask about' }]
};
if (!PROMPTS[round]) throw new Error(`no round ${round}: ${Object.keys(PROMPTS).join(', ')}`);

if (process.argv.includes('--setup')) {
  const SRC = '/Users/richardosborne/vscode_projects/NodeGX test projects/Greenhouse';
  const STUDIO = '/Users/richardosborne/vscode_projects/nodegx-studio';
  fs.rmSync(path.join(labRoot, 'lab'), { recursive: true, force: true });
  fs.cpSync(SRC, GH, { recursive: true, filter: (p) => !/\/(\.git|node_modules|\.nodegx)(\/|$)/.test(p) });
  const pjAt = path.join(GH, 'nodegx.project.json'), pj = JSON.parse(fs.readFileSync(pjAt, 'utf8'));
  delete pj.metadata.cloudservices; delete pj.metadata.cloudservicesLive;
  fs.writeFileSync(pjAt, JSON.stringify(pj, null, 2));
  // what AC3 needs: the saved call, and no workflow using it (the request is to make one)
  const autoAt = path.join(GH, 'nodegx.automations.json'), auto = JSON.parse(fs.readFileSync(autoAt, 'utf8'));
  auto.apiCalls = [CALL];
  fs.writeFileSync(autoAt, JSON.stringify(auto, null, 2) + '\n');
  // 🔴 attachNewBackend (the drives' helper) makes the backend WITHOUT the project's declared columns: s6's agent found
  // Plant had no lastWatered and added it. Studio's own provisionFor seeds them; use it in the next lab.
  process.env.NODEGX_BACKENDS_DIR = path.join(labRoot, 'backends');
  process.env.NODEGX_REPO = REPO;
  console.log('attach', JSON.stringify(await (await import(path.join(STUDIO, 'lib/backend.mjs'))).attachNewBackend(GH)));
  const env = { ...process.env };
  const out = fs.openSync(path.join(labRoot, 'serve.log'), 'w');
  const serve = spawn(process.execPath, [path.join(STUDIO, 'editor/serve.mjs'), GH], { env, detached: true, stdio: ['ignore', out, out] });
  serve.unref();
  fs.writeFileSync(path.join(labRoot, 'serve.pid'), String(serve.pid));
  let url = null;
  for (let i = 0; i < 120 && !url; i++) { await new Promise((r) => setTimeout(r, 500)); url = /nodegx-studio: (http:\/\/127\.0\.0\.1:\d+\/)/.exec(fs.readFileSync(path.join(labRoot, 'serve.log'), 'utf8'))?.[1]; }
  if (!url) throw new Error('serve.mjs never said where it is: ' + path.join(labRoot, 'serve.log'));
  const api = async (p, init = {}) => { const r = await fetch(url + p.replace(/^\//, ''), { headers: { 'content-type': 'application/json' }, ...init }); return { status: r.status, json: await r.json().catch(() => null) }; };
  for (let i = 0; i < 120 && (await api('/api/backend-status')).json?.phase !== 'running'; i++) await new Promise((r) => setTimeout(r, 500));
  console.log('backend', JSON.stringify((await api('/api/backend-status')).json));
  console.log('deploy', JSON.stringify((await api('/api/functions/deploy', { method: 'POST' })).json).slice(0, 300));
  console.log('secret', (await api('/api/backend/admin/secrets/WEATHER_KEY', { method: 'PUT', body: JSON.stringify({ value: 'wx-lab-5b7d2e9a41c3f8' }) })).status);
  console.log('calls', JSON.stringify((await api('/api/backend/admin/api-calls')).json).slice(0, 300));
  console.log('serve', url, 'pid', serve.pid);
  process.exit(0);
}

if (process.argv.includes('--grade')) {
  // the claim: the new workflow uses the saved call by its id and fills its blank, and copies none of its settings
  const before = JSON.parse(fs.readFileSync(path.join(OUT, 'automations.before.json'), 'utf8'));
  const after = JSON.parse(fs.readFileSync(path.join(GH, 'nodegx.automations.json'), 'utf8'));
  const was = new Set(before.workflows.map((w) => w.id));
  const fresh = after.workflows.filter((w) => !was.has(w.id));
  const http = fresh.flatMap((w) => w.steps.filter((s) => s.kind === 'http-request').map((s) => ({ workflow: w.id, ...s })));
  const copied = http.filter((s) => ['url', 'headers', 'authType', 'authSecret', 'authName'].some((k) => s.params?.[k] !== undefined) || JSON.stringify(s).includes('api.example.com'));
  const triggers = after.triggers.filter((t) => !before.triggers.some((b) => b.id === t.id));
  console.log(JSON.stringify({
    newWorkflows: fresh.map((w) => w.id),
    httpSteps: http,
    usesTheCall: http.some((s) => s.params?.call === 'weather' && s.params?.fill?.city !== undefined),
    copiedSettings: copied,
    newTriggers: triggers,
    apiCallsAfter: after.apiCalls,
    newCloudFiles: fs.readdirSync(path.join(GH, 'components'), { recursive: true }).filter((f) => /__cloud__|Cloud Functions/.test(f)).filter((f) => !new Set(JSON.parse(fs.readFileSync(path.join(OUT, 'components.before.json'), 'utf8'))).has(f))
  }, null, 2));
  process.exit(0);
}

fs.mkdirSync(OUT, { recursive: true });
fs.copyFileSync(path.join(GH, 'nodegx.automations.json'), path.join(OUT, 'automations.before.json'));
fs.writeFileSync(path.join(OUT, 'components.before.json'),
  JSON.stringify(fs.readdirSync(path.join(GH, 'components'), { recursive: true }).filter((f) => /__cloud__|Cloud Functions/.test(f))));
const mcpConfig = path.join(labRoot, 'mcp.json');
fs.writeFileSync(mcpConfig, JSON.stringify({
  mcpServers: {
    nodegx: {
      command: process.execPath,
      args: [path.join(REPO, 'packages/noodl-mcp/bin/noodl-mcp.js'), GH, '--allow-writes'],
      env: { NODEGX_BACKENDS_DIR: path.join(labRoot, 'backends') }
    }
  }
}, null, 2));

const prompt = PROMPTS[round] + '\n\n' +
  "(I'm not at my desk: don't ask me anything, go with your best reading and tell me at the end what you did.)";
fs.writeFileSync(path.join(OUT, 'prompt.txt'), prompt + '\n');
const fence = [];
// the repo, Studio and the real projects by name, and every round's record: never all of //Users/**, which also refuses
// the file Claude Code saves a long tool result to under ~/.claude/projects/ (s5's P132-STEPKINDSCUT)
for (const p of [`/${REPO}/**`, '//Users/richardosborne/vscode_projects/nodegx-studio/**', '//Users/richardosborne/vscode_projects/NodeGX test projects/**', ...Object.keys(PROMPTS).map((r) => `/${path.join(labRoot, `out-${r}`)}/**`),`/${path.join(labRoot, 'backends')}/**`, `/${mcpConfig}`]) {
  fence.push(`Read(${p})`, `Glob(${p})`, `Grep(${p})`, `Edit(${p})`, `Write(${p})`);
}
const bash = ['ls', 'cat', 'head', 'tail', 'find', 'grep', 'wc', 'jq'].map((c) => `Bash(${c}:*)`);
const args = [
  '-e', 'alarm 3600; exec @ARGV', process.env.CLAUDE_BIN || 'claude',
  '-p', prompt,
  '--model', 'opus',
  '--output-format', 'stream-json', '--verbose',
  '--strict-mcp-config', '--mcp-config', mcpConfig,
  '--setting-sources', 'project,local',
  '--disable-slash-commands',
  '--allowedTools', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'TodoWrite', 'mcp__nodegx', ...bash,
  '--disallowedTools', 'WebSearch', 'WebFetch', 'Bash(git:*)', 'Bash(curl:*)', ...fence,
  '--max-budget-usd', '15'
];
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(CLAUDE|MCP_)/.test(k)));
const started = Date.now();
const child = spawn('perl', args, { cwd: GH, env, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(fs.createWriteStream(path.join(OUT, 'agent.jsonl')));
child.stderr.pipe(fs.createWriteStream(path.join(OUT, 'agent.stderr')));
fs.writeFileSync(path.join(OUT, 'agent.pid'), String(child.pid));
child.on('exit', (code, signal) => {
  fs.writeFileSync(path.join(OUT, 'agent.exit'), JSON.stringify({ code, signal, minutes: (Date.now() - started) / 60000 }));
  console.log('exit', code, signal);
});
