// OWN-015 s15 stranger round (AC1 + NOTNODEGX): a fresh `claude -p` (Sonnet) in the folder the PACKED create-nodegx
// made (its CLAUDE.md/AGENTS.md included), the MCP from the s15 tarball, HOME empty. The sentence never says "NodeGX".
// The agent is never given the key: the person pastes it into the project's .env afterwards (R26, the .env route).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const S = path.dirname(new URL(import.meta.url).pathname);
const WORK = path.join(S, 'work', 'lingo-apps');
const prompt = fs.readFileSync(path.join(S, 'sentence.txt'), 'utf8');

const args = [
  '-p', prompt,
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
child.on('close', (code) => { fs.writeFileSync(path.join(S, 'agent.exit'), String(code)); console.log('exit', code); });
