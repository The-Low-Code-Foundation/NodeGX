// OWN-038 AC5 in Cline: a fresh Cline session in a DIFFERENT folder (<round>/home/elsewhere, no project skills),
// with the round's own HOME, lists the skills it can load. Run on the round that saved the sheet and on one that
// didn't (the control). Same env, seal and sandbox profile as OWN-026's round.mjs; no tap, no MCP.
//   node probe-cline.mjs <round name, e.g. round | stuck>
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, '../../../..');
const LAB = '/Users/Shared/nodegx-lab';
const CLINE_BIN = path.join(LAB, 'cline-3.0.71/node_modules/cline/bin/cline');
const MODEL = 'cline-pass/deepseek-v4.1-flash-1017';
const root = path.join(LAB, 'own038', `cl-${process.argv[2]}`);
const HOME = path.join(root, 'home');
const DATA = path.join(HOME, '.cline', 'data');
const cwd = path.join(HOME, 'elsewhere');
fs.mkdirSync(cwd, { recursive: true });
const key = fs.readFileSync(path.join(REPO, '.env'), 'utf8').split('\n').find((l) => l.startsWith('CLINE_PASS_API_KEY='));
const NODE_DIR = path.dirname(process.execPath);
const env = {
  LANG: 'en_GB.UTF-8', USER: 'person', LOGNAME: 'person', HOME, TMPDIR: path.join(HOME, 'tmp'), PWD: cwd,
  PATH: `${NODE_DIR}:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin`,
  CLINE_DIR: path.join(HOME, '.cline'), CLINE_DATA_DIR: DATA,
  CLINE_MCP_SETTINGS_PATH: path.join(HOME, 'elsewhere-no-mcp.json'),
  CLINE_SESSION_BACKEND_MODE: 'local', CLINE_NO_AUTO_UPDATE: '1', CLINE_HUB_PORT: '25998',
  CLINE_API_KEY: key.slice('CLINE_PASS_API_KEY='.length).trim().replace(/^["']|["']$/g, '')
};
fs.writeFileSync(env.CLINE_MCP_SETTINGS_PATH, JSON.stringify({ mcpServers: {} }));
const ask = 'Reply with exactly one line and nothing else: the names of every skill you can load, comma-separated. ' +
  'Do not call any tool.';
const r = spawnSync('sandbox-exec', ['-f', path.join(root, 'sandbox.sb'), CLINE_BIN, '--json', '-P', 'cline-pass', '-m', MODEL,
  '-c', cwd, '--data-dir', DATA, '-t', '180', '--retries', '3', ask], { cwd, env, encoding: 'utf8', maxBuffer: 1 << 26 });
fs.writeFileSync(path.join(HERE, 'out', `cl-probe-${process.argv[2]}.jsonl`), r.stdout);
// the last assistant text in Cline's JSON stream
const texts = r.stdout.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } })
  .filter(Boolean).map((e) => e.text ?? e.message?.text ?? e.content ?? '').filter((t) => typeof t === 'string' && t.trim());
console.log(`probe cl-${process.argv[2]} from ${cwd}: exit ${r.status}\n${texts.slice(-1)[0] ?? r.stderr.slice(-1500)}`);
