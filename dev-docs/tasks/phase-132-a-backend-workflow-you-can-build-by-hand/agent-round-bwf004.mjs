// P132 BWF-004 AC4: one agent, one request, on a copy of Greenhouse through the checkout's MCP server.
// `node agent-round-bwf004.mjs <labRoot>`, where <labRoot> holds `lab/Greenhouse` (a copy with its own backend, running:
// Studio's serve.mjs started with NODEGX_REPO and NODEGX_BACKENDS_DIR=<labRoot>/backends) — the shape of
// phase-127's briefs/round.mjs, cut to one prompt. The agent is a fresh `claude -p` on Opus (the `opus` alias: this CLI refuses `claude-opus-5-5`) in the copy's folder: no
// repo, no web, no git, no user-scope MCP servers, the nodegx server alone (`packages/noodl-mcp/bin`, its dist rebuilt
// first), file tools fenced to the copy. `--allowedTools` pre-approves; in -p nothing else can be approved, so a tool
// not listed is refused. Run it under nohup with the Bash sandbox off (its render_report starts Chrome). The grade is
// the copy's `nodegx.automations.json` and functions afterwards, read by `--grade`.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const REPO = '/Users/richardosborne/vscode_projects/OpenNoodl';
const [labRoot, round = 'asked'] = process.argv.slice(2).filter((a) => a !== '--grade');
if (!labRoot) throw new Error('usage: agent-round-bwf004.mjs <labRoot> [asked|build] [--grade]');
const GH = path.join(labRoot, 'lab', 'Greenhouse');
const OUT = path.join(labRoot, `out-${round}`);

// the person's words, and the one line -p needs: a question asked back ends the run. `asked` is AC4's sentence as the
// task wrote it; s5 measured that an agent reads it as a question about the data and answers it (0 days), building
// nothing. `build` is the same want said as a change to the workflow, naming neither a formula nor a function.
const PROMPTS = {
  asked: 'Work out how many days since the plant was watered in the workflow.',
  build: 'In the workflow that runs when a plant is watered, work out how many days ago that watering was, and have ' +
    'the workflow give that number back at the end.'
};
if (!PROMPTS[round]) throw new Error(`no round ${round}: ${Object.keys(PROMPTS).join(', ')}`);

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
  console.log(JSON.stringify({
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
// every round's record, not only this one's: a later round must not read an earlier one's transcript
for (const p of ['//Users/**', ...Object.keys(PROMPTS).map((r) => `/${path.join(labRoot, `out-${r}`)}/**`),`/${path.join(labRoot, 'backends')}/**`, `/${mcpConfig}`]) {
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
