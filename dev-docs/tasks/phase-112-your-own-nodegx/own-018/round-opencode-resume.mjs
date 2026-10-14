// OWN-018 s2: carry a round-opencode.mjs round on in the SAME OpenCode session, as a person does when a run stops
// (`opencode run --session <id> "<what they say>"`). Same lab (HOME, XDG, seal rewritten from round-opencode.mjs's
// current rules), same app; the agent gets one more user message. The spend cap counts the whole round (every sitting).
// Each sitting's stream goes to agent-<n>.jsonl / agent-<n>.stderr / agent-<n>.exit.
//   node round-opencode-resume.mjs <root> "<what the person says>" [--max-usd X] [--proxy <port>]
// --proxy: Mistral is reached through record-proxy.mjs on that port (harness config, unseen by the agent).
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const [rootArg, say, ...rest] = process.argv.slice(2);
if (!rootArg || !say) throw new Error('usage: node round-opencode-resume.mjs <root> "<what the person says>" [--max-usd X]');
const opt = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : dflt; };
const root = fs.realpathSync(rootArg);
const HOME = path.join(root, 'home');
const APPS = path.join(root, 'work', 'apps');
const XDG = {
  XDG_CONFIG_HOME: path.join(HOME, '.config'),
  XDG_DATA_HOME: path.join(HOME, '.local', 'share'),
  XDG_CACHE_HOME: path.join(HOME, '.cache'),
  XDG_STATE_HOME: path.join(HOME, '.local', 'state')
};
const db = path.join(XDG.XDG_DATA_HOME, 'opencode', 'opencode.db');
const q = (sql) => (spawnSync('sqlite3', ['-readonly', '-separator', ' ', db, sql], { encoding: 'utf8' }).stdout || '').trim();
const session = q("select session_id from message where json_extract(data,'$.agent')='build' order by rowid limit 1");
if (!session) throw new Error('no build session in the round');

// The seal as round-opencode.mjs writes it today (its rules may have changed since the round began: s2 allowed
// OpenCode's own $TMPDIR/opencode/*).
const seal = JSON.parse(fs.readFileSync(path.join(root, 'opencode-seal.json'), 'utf8'));
seal.permission.external_directory = { '*': 'deny', [path.join(HOME, 'tmp', 'opencode', '*')]: 'allow' };
if (opt('--proxy', null)) seal.provider = { mistral: { options: { baseURL: `http://127.0.0.1:${opt('--proxy')}/v1` } } };
else delete seal.provider;
fs.writeFileSync(path.join(XDG.XDG_CONFIG_HOME, 'opencode', 'opencode.json'), JSON.stringify(seal, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'opencode-seal.json'), JSON.stringify(seal, null, 2) + '\n');

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const envLine = fs.readFileSync(path.join(REPO, '.env'), 'utf8').split('\n').find((l) => l.startsWith('MISTRAL_API_KEY='));
const env = { ...process.env };
for (const k of Object.keys(env)) if (k.startsWith('NODEGX_') || k.startsWith('NOODL_') || k.startsWith('OPENCODE_') || /KEY|TOKEN|SECRET/.test(k)) delete env[k];
Object.assign(env, { HOME, ...XDG, TMPDIR: path.join(HOME, 'tmp'), npm_config_cache: path.join(HOME, '.npm'), PWD: APPS,
  MISTRAL_API_KEY: envLine.slice('MISTRAL_API_KEY='.length).trim().replace(/^["']|["']$/g, '') });

let n = 2;
while (fs.existsSync(path.join(root, `agent-${n}.jsonl`))) n++;
const args = ['-y', 'opencode-ai@1.19.0', 'run', '--format', 'json', '--session', session, say];
fs.appendFileSync(path.join(root, 'command.txt'), `# sitting ${n}: cd ${APPS} && npx ${args.slice(0, -1).join(' ')} ${JSON.stringify(say)}\n`);
const child = spawn('npx', args, { cwd: APPS, env, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(fs.createWriteStream(path.join(root, `agent-${n}.jsonl`)));
child.stderr.pipe(fs.createWriteStream(path.join(root, `agent-${n}.stderr`)));

const t0 = Date.now();
let capped = null;
const maxUsd = Number(opt('--max-usd', 0));
const guard = maxUsd && setInterval(() => {
  const [input, cached, out] = q("select coalesce(sum(json_extract(data,'$.tokens.input')),0), coalesce(sum(json_extract(data,'$.tokens.cache.read')),0), coalesce(sum(json_extract(data,'$.tokens.output')),0) + coalesce(sum(json_extract(data,'$.tokens.reasoning')),0) from message where json_extract(data,'$.role')='assistant'").split(' ').map(Number);
  const usd = (input * 0.68 + cached * 0.07 + out * 2.09) / 1e6;
  fs.writeFileSync(path.join(root, 'agent.spend'), `${usd.toFixed(4)} input=${input} cached=${cached} out=${out}\n`);
  if (usd > maxUsd && !capped) {
    capped = usd;
    const tree = (pid) => [pid, ...(spawnSync('pgrep', ['-P', String(pid)], { encoding: 'utf8' }).stdout || '').split('\n').filter(Boolean).flatMap((c) => tree(Number(c)))];
    for (const pid of tree(child.pid).reverse()) try { process.kill(pid, 'SIGTERM'); } catch {}
  }
}, 15000);
child.on('close', (code) => {
  if (guard) clearInterval(guard);
  const how = capped ? `capped at $${capped.toFixed(2)}` : String(code);
  fs.writeFileSync(path.join(root, `agent-${n}.exit`), `${how} ${Math.round((Date.now() - t0) / 1000)}s`);
  console.log('exit', how);
});
