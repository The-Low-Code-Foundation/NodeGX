// OWN-036 AC5: one sealed stranger Claude Code in one lab folder, with only what `npm create nodegx` gave that folder.
// Shaped on P130's dev-docs/parked/platform-kit/_make/arm.mjs, with the two changes this AC needs (read 2026-11-03):
//   - the folder's own `.mcp.json` (the `nodegx` server the kit wrote), not an empty MCP config;
//   - skills ON (no --disable-slash-commands: the project skills are what is measured), with Richard's user-scope
//     settings, plugins and hooks dropped by --setting-sources project,local. `--probe` lists what leaks.
// File tools are refused everywhere under ~/vscode_projects but this arm's own folder, and under ~/.claude/projects
// but its own transcripts. Bash is not fenced; read the transcript for reaches afterwards (P130's read-lab.mjs).
//   node own-036/arm.mjs a [--lab ~/vscode_projects/fp-lab] [--probe] [-- <more claude args>]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const rest = argv.includes('--') ? argv.splice(argv.indexOf('--')).slice(1) : [];
const arm = argv[0];
if (!/^[a-f]$/.test(arm ?? '')) throw new Error('usage: node own-036/arm.mjs a|b|c|d|e|f [--lab <folder>] [--probe]');
// e and f are "Claude alone" (Richard, 2026-11-04): an empty folder, no NodeGX server, no skills. Their MCP config is
// an empty one written beside this script, so nothing in the lab folder hints at a kit.
const bare = arm === 'e' || arm === 'f';
const at = argv.indexOf('--lab');
const lab = path.resolve(at >= 0 ? argv[at + 1] : path.join(os.homedir(), 'vscode_projects/fp-lab'));
const probe = argv.includes('--probe');
const root = path.join(lab, arm);
const dir = path.join(root, 'my-apps');
const mcp = bare ? path.join(here, `.arm-${arm}.mcp.json`) : path.join(dir, '.mcp.json');
if (bare) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(mcp, JSON.stringify({ mcpServers: {} }));
}
if (!fs.existsSync(mcp)) throw new Error(`${dir} has no .mcp.json: make it with own-036/lab.mjs`);

const ownTranscripts = dir.replace(/[^A-Za-z0-9]/g, '-');
const children = (d) => (fs.existsSync(d) ? fs.readdirSync(d).map((n) => path.join(d, n)) : []);
const fenced = [];
for (const p of children(path.join(os.homedir(), 'vscode_projects'))) if (p !== lab) fenced.push(p);
for (const p of children(lab)) if (p !== root) fenced.push(p);
fenced.push('/Users/Shared/nodegx-lab');
for (const p of children(path.join(os.homedir(), '.claude/projects'))) if (path.basename(p) !== ownTranscripts) fenced.push(p);
const deny = fenced.flatMap((p) => [`Read(/${p}/**)`, `Edit(/${p}/**)`]);
// Written beside this script (gitignored), never in the lab, where `ls ..` would show it.
const settings = path.join(here, `.arm-${arm}.settings.json`);
fs.writeFileSync(settings, JSON.stringify({ permissions: { deny } }, null, 1));

const sealed = ['--strict-mcp-config', '--mcp-config', mcp, '--setting-sources', 'project,local',
  '--settings', settings];
const ask = 'Reply with exactly three lines and nothing else. Line 1: the names of every skill you can load, ' +
  'comma-separated. Line 2: the names of every slash command or custom command you have, comma-separated. Line 3: the ' +
  'names of the MCP servers you have tools from. Do not call any tool.';
const args = probe
  ? ['-p', ask, '--model', 'haiku', ...sealed, '--no-session-persistence', ...rest]
  : ['--model', 'claude-opus-5-5', ...sealed, ...rest];
// The PATH `claude` lags the VS Code extension's own copy (P130: it refused claude-opus-5-5). Take the newest.
const exts = path.join(os.homedir(), '.vscode/extensions');
const bundled = children(exts).filter((p) => /anthropic\.claude-code-/.test(p)).map((p) => path.join(p, 'resources/native-binary/claude'))
  .filter((p) => fs.existsSync(p)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
const bin = process.env.CLAUDE_BIN ?? bundled[0] ?? 'claude';
console.error(`arm ${arm}: ${dir}, ${fenced.length} folders fenced from the file tools, ${bare ? 'no MCP' : 'own .mcp.json'}, project settings only; ${bin}`);
process.exit(spawnSync(bin, args, { cwd: dir, stdio: 'inherit' }).status ?? 1);
