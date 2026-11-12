// P132 BWF-013 AC3: one agent, one request, on a copy of Greenhouse through the checkout's MCP server. BWF-012's round
// (agent-round-bwf012.mjs) with this lab: `node agent-round-bwf013.mjs <labRoot> --setup` copies Greenhouse to
// `<labRoot>/lab/Greenhouse`, ADDS two report workflows that COPY the same two steps (find the thirsty plants, count
// them) before each one's own email, each started by its own schedule, starts Studio's serve.mjs on it with NODEGX_REPO
// and NODEGX_BACKENDS_DIR=<labRoot>/backends (pid in <labRoot>/serve.pid: kill it after), so the backend is seeded with
// them. Then `node agent-round-bwf013.mjs <labRoot>`; `--grade` reads the file afterwards: a new workflow holding the
// shared steps, both reports running it with a `run-workflow` step, neither keeping its own copy, no new function.
// The agent: a fresh `claude -p` on Opus (`opus` alias), the nodegx server alone (`packages/noodl-mcp/bin`, its dist
// rebuilt first), file tools fenced to the copy. Run under nohup with the Bash sandbox off.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const REPO = '/Users/richardosborne/vscode_projects/OpenNoodl';
const [labRoot, round = 'asked'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!labRoot) throw new Error('usage: agent-round-bwf013.mjs <labRoot> [asked] [--setup|--grade]');
const GH = path.join(labRoot, 'lab', 'Greenhouse');
const OUT = path.join(labRoot, `out-${round}`);

// the person's words, said as a change (s5: a question builds nothing), naming neither the kind nor "piece"
const PROMPTS = {
  asked:
    'My weekly report and my monthly report both find the thirsty plants and count them, with the same steps copied ' +
    'in each. Make those steps one thing both reports use, so I only change them in one place.'
};
const SHARED = (prefix) => [
  {
    id: 'find',
    name: 'Find the thirsty plants',
    kind: 'find-records',
    params: { table: 'Plant', where: [{ field: 'thirsty', op: 'eq', value: true }], sortBy: 'name', limit: 100 },
    routes: { nonempty: ['sum'], empty: ['sum'] }
  },
  {
    id: 'sum',
    name: 'Count them',
    kind: 'transform',
    params: { output: { count: { $path: 'upstream.find.count' }, names: { $fn: 'join', args: [{ $fn: 'pick', args: [{ $path: 'upstream.find.items' }, 'name'] }, ', '] } } },
    next: ['email']
  },
  {
    id: 'email',
    name: 'Email the report',
    kind: 'send-email',
    params: {
      to: prefix === 'week' ? 'gardener@example.com' : 'owner@example.com',
      subject: { $fn: 'text', args: [prefix === 'week' ? 'This week: ' : 'This month: ', { $path: 'upstream.sum.count' }, ' thirsty plants'] },
      body: { $fn: 'text', args: ['Thirsty: ', { $path: 'upstream.sum.names' }] }
    }
  }
];
const REPORTS = [
  { id: 'weekly-report', name: 'The weekly report', entry: 'find', concurrency: 1, steps: SHARED('week') },
  { id: 'monthly-report', name: 'The monthly report', entry: 'find', concurrency: 1, steps: SHARED('month') }
];
const TRIGGERS = [
  { id: 'trg_weekly_report', type: 'schedule', name: 'Every Monday at 08:00', enabled: true, target: { kind: 'workflow', name: 'weekly-report' }, schedule: { cron: '0 8 * * 1', missedFirePolicy: 'skip' } },
  { id: 'trg_monthly_report', type: 'schedule', name: 'The first of the month at 08:00', enabled: true, target: { kind: 'workflow', name: 'monthly-report' }, schedule: { cron: '0 8 1 * *', missedFirePolicy: 'skip' } }
];
if (!PROMPTS[round]) throw new Error(`no round ${round}: ${Object.keys(PROMPTS).join(', ')}`);

if (process.argv.includes('--setup')) {
  const SRC = '/Users/richardosborne/vscode_projects/NodeGX test projects/Greenhouse';
  const STUDIO = '/Users/richardosborne/vscode_projects/nodegx-studio';
  fs.rmSync(path.join(labRoot, 'lab'), { recursive: true, force: true });
  fs.cpSync(SRC, GH, { recursive: true, filter: (p) => !/\/(\.git|node_modules|\.nodegx)(\/|$)/.test(p) });
  const pjAt = path.join(GH, 'nodegx.project.json'), pj = JSON.parse(fs.readFileSync(pjAt, 'utf8'));
  delete pj.metadata.cloudservices; delete pj.metadata.cloudservicesLive;
  fs.writeFileSync(pjAt, JSON.stringify(pj, null, 2));
  // what AC3 needs: two workflows that copy the same steps, and no piece (the request is to make one)
  const autoAt = path.join(GH, 'nodegx.automations.json'), auto = JSON.parse(fs.readFileSync(autoAt, 'utf8'));
  auto.workflows.push(...REPORTS);
  auto.triggers.push(...TRIGGERS);
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
  const defs = (await api('/api/backend/admin/workflow-defs')).json;
  console.log('workflows', JSON.stringify((defs?.workflows || []).map((w) => w.id)));
  console.log('serve', url, 'pid', serve.pid);
  process.exit(0);
}

if (process.argv.includes('--grade')) {
  // the claim: the shared steps live in ONE new workflow, both reports run it by id, neither keeps its own copy
  const before = JSON.parse(fs.readFileSync(path.join(OUT, 'automations.before.json'), 'utf8'));
  const after = JSON.parse(fs.readFileSync(path.join(GH, 'nodegx.automations.json'), 'utf8'));
  const was = new Set(before.workflows.map((w) => w.id));
  const fresh = after.workflows.filter((w) => !was.has(w.id));
  const report = (id) => after.workflows.find((w) => w.id === id);
  const runs = (w) => (w?.steps || []).filter((s) => s.kind === 'run-workflow').map((s) => ({ step: s.id, workflow: s.params?.workflow, send: s.params?.send }));
  const kinds = (w) => (w?.steps || []).map((s) => s.kind);
  const pieceIds = [...new Set(['weekly-report', 'monthly-report'].flatMap((id) => runs(report(id)).map((r) => r.workflow)))];
  const piece = after.workflows.find((w) => pieceIds.length === 1 && w.id === pieceIds[0]);
  const reqs = fs.readFileSync(path.join(OUT, 'agent.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const toolCalls = reqs.flatMap((m) => (m.message?.content || []).filter((c) => c.type === 'tool_use').map((c) => c.name.replace(/^mcp__nodegx__/, '') + (c.input?.name ? `(${c.input.name})` : '')));
  const result = reqs.find((m) => m.type === 'result');
  console.log(JSON.stringify({
    newWorkflows: fresh.map((w) => ({ id: w.id, name: w.name, kinds: kinds(w), steps: w.steps })),
    weekly: { kinds: kinds(report('weekly-report')), runs: runs(report('weekly-report')) },
    monthly: { kinds: kinds(report('monthly-report')), runs: runs(report('monthly-report')) },
    // the AC: one piece, run from both, holding the find; the reports keep their own email and no find of their own
    onePieceRunFromBoth: pieceIds.length === 1 && runs(report('weekly-report')).length > 0 && runs(report('monthly-report')).length > 0,
    pieceHoldsTheFind: !!piece && kinds(piece).includes('find-records'),
    reportsKeepNoCopy: !kinds(report('weekly-report')).includes('find-records') && !kinds(report('monthly-report')).includes('find-records'),
    emailsKept: kinds(report('weekly-report')).includes('send-email') && kinds(report('monthly-report')).includes('send-email'),
    newTriggers: after.triggers.filter((t) => !before.triggers.some((b) => b.id === t.id)),
    newCloudFiles: fs.readdirSync(path.join(GH, 'components'), { recursive: true }).filter((f) => /__cloud__|Cloud Functions/.test(f)).filter((f) => !new Set(JSON.parse(fs.readFileSync(path.join(OUT, 'components.before.json'), 'utf8'))).has(f)),
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
