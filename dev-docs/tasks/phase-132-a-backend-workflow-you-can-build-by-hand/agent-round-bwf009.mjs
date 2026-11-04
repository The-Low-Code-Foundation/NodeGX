// P132 BWF-009 part 2: the test's three briefs, given in words to one fresh agent, on a fresh copy of Greenhouse.
// `node agent-round-bwf009.mjs <labRoot> --setup` copies Greenhouse to `<labRoot>/lab/Greenhouse` WITHOUT what the
// briefs ask for (The morning check and When a plant is watered, and their triggers: s6, a lab must remove what the
// request asks for), makes its backend with Studio's `provisionFor` in a process of its own (the project's declared
// Plant and Watering columns seeded; `attachNewBackend` seeds none), starts Studio's serve.mjs on it with NODEGX_REPO
// and NODEGX_BACKENDS_DIR=<labRoot>/backends (pid in <labRoot>/serve.pid: kill it after), and adds three plants, two
// of them not watered for three days. Then `node agent-round-bwf009.mjs <labRoot>`; `--grade` reads the file after.
// The agent: a fresh `claude -p` on Opus (`opus` alias), the nodegx server alone (`packages/noodl-mcp/bin`, its dist
// rebuilt first), file tools fenced to the copy. Run under nohup with the Bash sandbox off.
// Pass (BWF-009): no cloud function made for any brief, and every step one Studio draws as a form (a catalog kind, no
// function step), so a person can change it with no code.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const REPO = '/Users/richardosborne/vscode_projects/OpenNoodl';
const STUDIO = '/Users/richardosborne/vscode_projects/nodegx-studio';
const [labRoot, round = 'briefs'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!labRoot) throw new Error('usage: agent-round-bwf009.mjs <labRoot> [briefs] [--setup|--grade]');
const GH = path.join(labRoot, 'lab', 'Greenhouse');
const OUT = path.join(labRoot, `out-${round}`);

// BWF-009's three briefs, each said as a change (s5: a question builds nothing), naming no kind and no step
const PROMPTS = {
  briefs:
    'Three things for my Greenhouse app’s backend, please:\n' +
    '1. When a watering is logged, set that plant’s last-watered date.\n' +
    '2. Every morning at 8, find the plants that haven’t been watered for three days and email me the list at ' +
    'gardener@example.com. Try it out on sample data before it’s switched on.\n' +
    '3. When a form outside the app posts a new plant, make it.'
};
const REMOVE = ['morning-check', 'when-watered'];
const KINDS = new Set(['run-workflow', 'branch', 'switch', 'for-each', 'merge', 'transform', 'validate', 'filter', 'sort', 'deduplicate', 'split', 'create-record', 'update-record', 'delete-record', 'find-records', 'http-request', 'send-email', 'stop', 'return', 'wait', 'wait-until']);
if (!PROMPTS[round]) throw new Error(`no round ${round}: ${Object.keys(PROMPTS).join(', ')}`);

if (process.argv.includes('--setup')) {
  const SRC = '/Users/richardosborne/vscode_projects/NodeGX test projects/Greenhouse';
  fs.rmSync(path.join(labRoot, 'lab'), { recursive: true, force: true });
  fs.cpSync(SRC, GH, { recursive: true, filter: (p) => !/\/(\.git|node_modules|\.nodegx)(\/|$)/.test(p) });
  const pjAt = path.join(GH, 'nodegx.project.json'), pj = JSON.parse(fs.readFileSync(pjAt, 'utf8'));
  delete pj.metadata.cloudservices; delete pj.metadata.cloudservicesLive;
  fs.writeFileSync(pjAt, JSON.stringify(pj, null, 2));
  const autoAt = path.join(GH, 'nodegx.automations.json'), auto = JSON.parse(fs.readFileSync(autoAt, 'utf8'));
  auto.workflows = auto.workflows.filter((w) => !REMOVE.includes(w.id));
  auto.triggers = auto.triggers.filter((t) => !REMOVE.includes(t.target?.name));
  fs.writeFileSync(autoAt, JSON.stringify(auto, null, 2) + '\n');
  const env = { ...process.env, NODEGX_BACKENDS_DIR: path.join(labRoot, 'backends'), NODEGX_REPO: REPO };
  // provisionFor's exit hooks stop the backend when its process ends; the schema stays in the backend's folder and
  // serve.mjs starts the bound backend again, so it runs in a process of its own
  console.log('provision', execFileSync(process.execPath, ['--input-type=module', '-e',
    `const b = await import(${JSON.stringify(path.join(STUDIO, 'lib/backend.mjs'))}); console.log(JSON.stringify(await b.provisionFor(${JSON.stringify(GH)}))); process.exit(0);`], { env, encoding: 'utf8' }).trim());
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
  const daysAgo = (d) => ({ __type: 'Date', iso: new Date(Date.now() - d * 86400000).toISOString() });
  for (const [name, days, every] of [['Fern', 5, 3], ['Cactus', 10, 14], ['Basil', 1, 2]]) {
    const r = await api('/api/backend/classes/Plant', { method: 'POST', body: JSON.stringify({ name, room: 'Kitchen', waterEvery: every, lastWatered: daysAgo(days), thirsty: days >= every }) });
    console.log('plant', name, r.status, JSON.stringify(r.json));
  }
  const schema = (await api('/api/backend/admin/schema')).json;
  console.log('schema', JSON.stringify(schema).slice(0, 400));
  const defs = (await api('/api/backend/admin/workflow-defs')).json;
  console.log('workflows', JSON.stringify((defs?.workflows || []).map((w) => w.id)));
  console.log('serve', url, 'pid', serve.pid);
  process.exit(0);
}

if (process.argv.includes('--grade')) {
  const before = JSON.parse(fs.readFileSync(path.join(OUT, 'automations.before.json'), 'utf8'));
  const after = JSON.parse(fs.readFileSync(path.join(GH, 'nodegx.automations.json'), 'utf8'));
  const was = new Set(before.workflows.map((w) => w.id));
  const fresh = after.workflows.filter((w) => !was.has(w.id));
  const startsOf = (w) => after.triggers.filter((t) => t.target?.kind === 'workflow' && t.target?.name === w.id).map((t) => ({ type: t.type, name: t.name, enabled: t.enabled, cron: t.schedule?.cron, table: t.collection ?? t.table ?? t.className, event: t.event ?? t.events, path: t.path ?? t.webhook?.path }));
  const brief = (pred) => fresh.filter((w) => startsOf(w).some(pred)).map((w) => w.id);
  const reqs = fs.readFileSync(path.join(OUT, 'agent.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const toolCalls = reqs.flatMap((m) => (m.message?.content || []).filter((c) => c.type === 'tool_use').map((c) => c.name.replace(/^mcp__nodegx__/, '') + (c.input?.name ? `(${c.input.name})` : c.input?.tool ? `(${c.input.tool})` : '')));
  const result = reqs.find((m) => m.type === 'result');
  const cloudNow = fs.readdirSync(path.join(GH, 'components'), { recursive: true }).filter((f) => /__cloud__|Cloud Functions/.test(f));
  const cloudBefore = new Set(JSON.parse(fs.readFileSync(path.join(OUT, 'components.before.json'), 'utf8')));
  const steps = fresh.flatMap((w) => (w.steps || []).map((s) => ({ wf: w.id, id: s.id, kind: s.kind, ref: s.ref })));
  console.log(JSON.stringify({
    newWorkflows: fresh.map((w) => ({ id: w.id, name: w.name, starts: startsOf(w), steps: w.steps })),
    brief1Watering: brief((t) => t.type === 'db-change' && /water/i.test(JSON.stringify(t))),
    brief2Morning: brief((t) => t.type === 'schedule'),
    brief3Webhook: brief((t) => t.type === 'webhook'),
    // the pass: nothing written as code
    newCloudFiles: cloudNow.filter((f) => !cloudBefore.has(f)),
    functionSteps: steps.filter((s) => s.kind === 'call-function'),
    stepsStudioDrawsAsForms: steps.filter((s) => KINDS.has(s.kind)).length + ' of ' + steps.length,
    unknownKinds: steps.filter((s) => !KINDS.has(s.kind) && s.kind !== 'call-function'),
    removedOrChanged: before.workflows.filter((w) => JSON.stringify(w) !== JSON.stringify(after.workflows.find((x) => x.id === w.id))).map((w) => w.id),
    toolCalls,
    cost: result?.total_cost_usd,
    minutes: result ? result.duration_ms / 60000 : null,
    said: result?.result
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
// the repo, Studio and the real projects by name, and the round's record: never all of //Users/** (s5)
for (const p of [`/${REPO}/**`, `/${STUDIO}/**`, '//Users/richardosborne/vscode_projects/NodeGX test projects/**', `/${OUT}/**`, `/${path.join(labRoot, 'backends')}/**`, `/${mcpConfig}`]) {
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
