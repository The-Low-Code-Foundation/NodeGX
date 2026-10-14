// OWN-015 AC1 stranger round: a fresh `claude -p` (Sonnet) in the folder `create-nodegx` made, the MCP from the 0.2.0
// tarball with HOME empty. The agent is never given the key (Richard's ruling, 2026-10-12): it builds around a secret
// named GEMINI_API_KEY and Richard puts the key on the backend himself afterwards.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const S = path.dirname(new URL(import.meta.url).pathname);
const WORK = path.join(S, 'work', 'lingo-apps');
const prompt = fs.readFileSync(path.join(S, 'sentence.txt'), 'utf8');

const args = [
  '-p',
  prompt,
  '--model', 'sonnet',
  '--output-format', 'stream-json',
  '--verbose',
  '--strict-mcp-config',
  '--mcp-config', path.join(WORK, '.mcp.json'),
  '--setting-sources', 'project,local',
  '--allowedTools', 'mcp__nodegx', 'Read', 'Write', 'Edit', 'Glob', 'Grep',
  '--max-budget-usd', '20',
  '--no-session-persistence'
];

const log = fs.createWriteStream(path.join(S, 'agent.jsonl'));
const err = fs.createWriteStream(path.join(S, 'agent.stderr'));
const child = spawn('claude', args, { cwd: WORK, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(log);
child.stderr.pipe(err);
child.on('close', (code) => console.log('exit', code));
