// Starts Claude Code in one lab arm (THE-TEST.md §2) with only what that arm is meant to have. Measured 2026-10-30
// (s3 prep): a plain `claude` started in the lab inherits Richard's user-scope MCP servers, one of which tells the agent
// to build any app as a NodeGX project, not in hand-written JavaScript; and `ls ..` reaches this repository, the other
// arm, and a hundred other projects (several of them games). So:
//   - no MCP servers at all (--strict-mcp-config with an empty config);
//   - no skills or custom commands (--disable-slash-commands: Richard's /next and /next-go name this repository);
//   - the file tools refused everywhere under ~/vscode_projects but the arm's own folder, under /Users/Shared/nodegx-lab,
//     and under ~/.claude/projects but the arm's own transcripts and memory.
// Bash cannot be fenced by a rule, so it is not: `read-lab.mjs` reads the transcript for any path outside the arm.
// The deny list is written beside this script (gitignored), not in the lab, where `ls ..` would show it.
//   node _make/arm.mjs A [--lab ~/vscode_projects/platform-lab] [-- <more claude args>]
//   node _make/arm.mjs A --probe     (a one-line haiku run that prints the tools the session has, then exits)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const rest = argv.includes('--') ? argv.splice(argv.indexOf('--')).slice(1) : [];
const arm = argv[0];
if (!/^[AB]$/.test(arm ?? '')) throw new Error('usage: node _make/arm.mjs A|B [--lab <folder>] [--probe]');
const at = argv.indexOf('--lab');
const lab = path.resolve(at >= 0 ? argv[at + 1] : path.join(os.homedir(), 'vscode_projects/platform-lab'));
const probe = argv.includes('--probe');
const dir = path.join(lab, arm);
if (!fs.existsSync(dir)) throw new Error(`${dir} does not exist: make it with node _make/lab.mjs`);

// Claude Code names a project's transcript folder after its path, every non-alphanumeric character a dash.
const ownTranscripts = dir.replace(/[^A-Za-z0-9]/g, '-');
const fenced = [];
const children = (d) => (fs.existsSync(d) ? fs.readdirSync(d).map((n) => path.join(d, n)) : []);
for (const p of children(path.join(os.homedir(), 'vscode_projects'))) if (p !== lab) fenced.push(p);
for (const p of children(lab)) if (p !== dir) fenced.push(p);
fenced.push('/Users/Shared/nodegx-lab');
for (const p of children(path.join(os.homedir(), '.claude/projects'))) if (path.basename(p) !== ownTranscripts) fenced.push(p);
// `//` marks an absolute path in a permission rule; a single leading `/` would be relative to the settings file.
const deny = fenced.flatMap((p) => [`Read(/${p}/**)`, `Edit(/${p}/**)`]);
const settings = path.join(here, `.arm-${arm}.settings.json`);
fs.writeFileSync(settings, JSON.stringify({ permissions: { deny } }, null, 1));
const empty = path.join(here, '.arm-no-mcp.json');
fs.writeFileSync(empty, JSON.stringify({ mcpServers: {} }));

const sealed = ['--strict-mcp-config', '--mcp-config', empty, '--disable-slash-commands', '--settings', settings];
const ask = 'List every tool you have, by exact name, comma-separated, nothing else. Then on a new line, try to Read ' +
  `the file ${path.join(os.homedir(), 'vscode_projects/OpenNoodl/README.md')} and say only "READ" or "REFUSED".`;
const args = probe
  ? ['-p', ask, '--model', 'haiku', ...sealed, '--no-session-persistence', ...rest]
  : ['--model', 'claude-opus-5-5', ...sealed, ...rest];
console.error(`arm ${arm}: ${dir}, ${fenced.length} folders fenced from the file tools, no MCP, no skills`);
process.exit(spawnSync('claude', args, { cwd: dir, stdio: 'inherit' }).status ?? 1);
