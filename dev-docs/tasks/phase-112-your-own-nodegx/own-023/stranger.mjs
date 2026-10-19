// OWN-023 §2.1 C4/C6/C7: one fresh Opus 5.5 OUTSIDE the repo — the outside checklist, A+'s harness writer, the hats,
// the graders' briefs, the write-up's writer. A clean folder holding only what that stranger is given; no settings
// (`--setting-sources ""`: no user/project CLAUDE.md, settings or skills), no MCP (`--strict-mcp-config`, none named),
// no session saved, only the tools named, and reads of /Users/** and /Applications/** denied by rule, so the repo, the
// memory and the other strangers' folders are out of reach. Claude Code keeps Richard's HOME only for its login
// (subscription; the $ in the result line is API-equivalent). The transcript is audited after by peek-claude.mjs.
//
//   node stranger.mjs <folder> <prompt-file> [--tools Read,Write,Glob,Grep] [--cap 20] [--model claude-opus-5-5]
// Writes <folder>/../agent.jsonl, agent.stderr, agent.exit, command.txt beside the folder (never inside it, so the
// stranger can't read its own log).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const [folderArg, promptFile, ...rest] = process.argv.slice(2);
if (!folderArg || !promptFile) throw new Error('usage: node stranger.mjs <folder> <prompt-file> [--tools …] [--cap N]');
const opt = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : dflt; };
const folder = fs.realpathSync(folderArg);
if (folder.startsWith('/Users/')) throw new Error(`${folder} is under /Users: a stranger's folder sits outside every repo and HOME`);
const out = path.dirname(folder);
const BIN = process.env.CLAUDE_BIN || path.join(process.env.HOME, '.vscode/extensions/anthropic.claude-code-2.1.301-darwin-arm64/resources/native-binary/claude');
const prompt = fs.readFileSync(promptFile, 'utf8').trim();
const tools = opt('--tools', 'Read,Write,Glob,Grep');
const args = [
  '-p', prompt,
  '--model', opt('--model', 'claude-opus-5-5'),
  '--output-format', 'stream-json', '--verbose',
  '--setting-sources', '',
  '--strict-mcp-config',
  '--tools', tools,
  '--allowedTools', ...tools.split(','),
  '--disallowedTools', 'WebFetch', 'WebSearch', 'Read(//Users/**)', 'Glob(//Users/**)', 'Grep(//Users/**)', 'Read(//Applications/**)',
  '--max-budget-usd', opt('--cap', '20'),
  '--no-session-persistence'
];
fs.writeFileSync(path.join(out, 'command.txt'), `cd ${folder} && ${BIN} ${args.map((a) => (a === prompt ? '"$(cat ' + path.resolve(promptFile) + ')"' : JSON.stringify(a))).join(' ')}\n`);
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(CLAUDE|MCP_|NODEGX_|NOODL_)/.test(k) && !/KEY|TOKEN|SECRET/.test(k)));
env.PWD = folder;
const t0 = Date.now();
const child = spawn(BIN, args, { cwd: folder, env, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(fs.createWriteStream(path.join(out, 'agent.jsonl')));
child.stderr.pipe(fs.createWriteStream(path.join(out, 'agent.stderr')));
child.on('exit', (code, signal) => {
  fs.writeFileSync(path.join(out, 'agent.exit'), JSON.stringify({ code, signal, seconds: Math.round((Date.now() - t0) / 1000) }) + '\n');
  console.log('exit', code, signal ?? '');
});
