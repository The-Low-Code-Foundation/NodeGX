// OWN-017 stranger round (R28: a stranger's Claude Code builds the editor, a table/form shape): a fresh `claude -p`
// (Sonnet) in a folder holding only a copy of the s15 app, no MCP, the kit from the npm REGISTRY. Bash is limited to
// read-only shell tools plus npm/npx/node/curl so it can install, build and try its server; no kill, no git, no rm.
// Attempt 1 (15:37) died with the parent session at 15:42 having only explored; this one runs under nohup.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const S = path.dirname(new URL(import.meta.url).pathname);
const WORK = path.join(S, 'work');
const prompt = fs.readFileSync(path.join(S, 'sentence.txt'), 'utf8');
fs.writeFileSync(path.join(WORK, '.mcp.json'), JSON.stringify({ mcpServers: {} }));

const args = [
  '-p', prompt,
  '--model', 'sonnet',
  '--output-format', 'stream-json',
  '--verbose',
  '--strict-mcp-config',
  '--mcp-config', path.join(WORK, '.mcp.json'),
  '--setting-sources', 'project,local',
  '--allowedTools', 'Read', 'Write', 'Edit', 'Glob', 'Grep',
  'Bash(npm:*)', 'Bash(npx:*)', 'Bash(node:*)', 'Bash(ls:*)', 'Bash(curl:*)', 'Bash(mkdir:*)', 'Bash(cat:*)',
  'Bash(cd:*)', 'Bash(head:*)', 'Bash(tail:*)', 'Bash(find:*)', 'Bash(grep:*)', 'Bash(wc:*)', 'Bash(pwd)', 'Bash(echo:*)', 'Bash(sleep:*)',
  '--max-budget-usd', '20',
  '--no-session-persistence'
];

const log = fs.createWriteStream(path.join(S, 'agent.jsonl'));
const err = fs.createWriteStream(path.join(S, 'agent.stderr'));
const child = spawn('claude', args, { cwd: WORK, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(log);
child.stderr.pipe(err);
child.on('close', (code) => { fs.writeFileSync(path.join(S, 'agent.exit'), String(code)); console.log('exit', code); });
