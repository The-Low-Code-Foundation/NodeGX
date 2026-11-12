// P132 BWF-005 AC4: one agent, one request, on a copy of Greenhouse through the checkout's MCP server. BWF-004's round
// (agent-round-bwf004.mjs) with the lab built here: `node agent-round-bwf005.mjs <labRoot> --setup` copies Greenhouse to
// `<labRoot>/lab/Greenhouse` WITHOUT what AC4 asks for (its *Mark watered* step and function, which already set the
// Plant's lastWatered), and starts Studio's serve.mjs on it with NODEGX_REPO and NODEGX_BACKENDS_DIR=<labRoot>/backends
// (pid in <labRoot>/serve.pid: kill it after). Then `node agent-round-bwf005.mjs <labRoot>` — the shape of
// phase-127's briefs/round.mjs, cut to one prompt. The agent is a fresh `claude -p` on Opus (the `opus` alias: this CLI refuses `claude-opus-5-5`) in the copy's folder: no
// repo, no web, no git, no user-scope MCP servers, the nodegx server alone (`packages/noodl-mcp/bin`, its dist rebuilt
// first), file tools fenced to the copy. `--allowedTools` pre-approves; in -p nothing else can be approved, so a tool
// not listed is refused. Run it under nohup with the Bash sandbox off (its render_report starts Chrome). The grade is
// the copy's `nodegx.automations.json` and functions afterwards, read by `--grade`.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const REPO = '/Users/richardosborne/vscode_projects/OpenNoodl';
const [labRoot, round = 'asked'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!labRoot) throw new Error('usage: agent-round-bwf005.mjs <labRoot> [asked] [--setup|--grade]');
const GH = path.join(labRoot, 'lab', 'Greenhouse');
const OUT = path.join(labRoot, `out-${round}`);

// the person's words, AC4's sentence as the task wrote it: a change said as a change (s5: a question builds nothing)
const PROMPTS = {
  asked: "When a watering is logged, update the plant's last-watered date."
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
  // what AC4 asks for, taken out: the step that calls Mark watered, and the function
  const autoAt = path.join(GH, 'nodegx.automations.json'), auto = JSON.parse(fs.readFileSync(autoAt, 'utf8'));
  const wf = auto.workflows.find((w) => w.id === 'when-watered');
  wf.steps = wf.steps.filter((s) => s.id !== 'mark');
  for (const s of wf.steps) if (s.next) s.next = s.next.filter((n) => n !== 'mark');
  fs.writeFileSync(autoAt, JSON.stringify(auto, null, 2) + '\n');
  fs.rmSync(path.join(GH, 'components/__cloud__/Cloud Functions/Mark watered'), { recursive: true, force: true });
  const regAt = path.join(GH, 'components/_registry.json'), reg = JSON.parse(fs.readFileSync(regAt, 'utf8'));
  delete reg.components['__cloud__/Cloud Functions/Mark watered'];
  fs.writeFileSync(regAt, JSON.stringify(reg, null, 2));
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
  const plant = await api('/api/backend/classes/Plant', { method: 'POST', body: JSON.stringify({ name: 'Monstera', room: 'Living room', waterEvery: 7 }) });
  const watering = await api('/api/backend/classes/Watering', { method: 'POST', body: JSON.stringify({ plant: { __type: 'Pointer', className: 'Plant', objectId: plant.json?.objectId }, note: 'A good soak', at: { __type: 'Date', iso: '2026-10-28T09:00:00.000Z' } }) });
  console.log('rows', plant.status, plant.json?.objectId, watering.status, watering.json?.objectId);
  console.log('serve', url, 'pid', serve.pid);
  process.exit(0);
}

if (process.argv.includes('--grade')) {
  // which steps carry a $fn, which are new, which functions are new: the claim is "a formula, not a cloud function"
  const before = JSON.parse(fs.readFileSync(path.join(OUT, 'automations.before.json'), 'utf8'));
  const after = JSON.parse(fs.readFileSync(path.join(GH, 'nodegx.automations.json'), 'utf8'));
  const fns = [];
  const walk = (v, at) => {
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${at}[${i}]`));
    else if (v && typeof v === 'object') {
      if (typeof v.$fn === 'string') fns.push({ at, formula: v });
      for (const [k, x] of Object.entries(v)) walk(x, `${at}.${k}`);
    }
  };
  for (const wf of after.workflows) for (const s of wf.steps) walk(s.params, `${wf.id}/${s.id}`);
  const stepsOf = (a) => new Set(a.workflows.flatMap((w) => w.steps.map((s) => `${w.id}/${s.id}:${s.kind}${s.ref ? ' ' + s.ref : ''}`)));
  const was = stepsOf(before);
  const cloud = (dir) => fs.readdirSync(dir, { recursive: true }).filter((f) => /__cloud__|Cloud Functions/.test(f));
  const fnBefore = new Set(JSON.parse(fs.readFileSync(path.join(OUT, 'components.before.json'), 'utf8')));
  const recordSteps = after.workflows.flatMap((w) => w.steps.filter((s) => /-record/.test(s.kind)).map((s) => ({ workflow: w.id, ...s })));
  console.log(JSON.stringify({
    recordSteps,
    callFunctionSteps: [...stepsOf(after)].filter((s) => / Cloud Functions\//.test(s) || /:call-function/.test(s)),
    formulas: fns,
    newSteps: [...stepsOf(after)].filter((s) => !was.has(s)),
    newCloudFiles: cloud(path.join(GH, 'components')).filter((f) => !fnBefore.has(f))
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
