// OWN-037: one turn of one arm, through OWN-026's two runners (round-vibe.mjs, round.mjs), each with --reply.
//   node turn.mjs <name> <va|vb|ca|cb> <message-file> [--reply] [--continues 0] [--timeout-min 120]
// <name> is the round's folder under /Users/Shared/nodegx-lab/own037/. Turn 1 makes it; --reply answers in the same
// chat (Vibe: -c; Cline: --id <its newest session>). A Cline turn goes through own-020/stream-tap.mjs in retry mode
// (ClinePass stream errors end a Cline run). Which arm carries the guides is in ARMS.json, never in what Richard sees.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const LAB = '/Users/Shared/nodegx-lab';
const KITS = path.join(LAB, 'kits');
const ARMS = {
  va: { harness: 'vibe', kit: 'OWN037-REG-0.2.9' },
  vb: { harness: 'vibe', kit: 'OWN037-VB' },
  ca: { harness: 'cline', kit: 'OWN037-CA-create028-mcp029' },
  cb: { harness: 'cline', kit: 'OWN037-REG-0.2.9' }
};
const MODEL_CLINE = 'cline-pass/deepseek-v4.1-flash-1017'; // R2, the id ClinePass lists on 2026-11-04

const [name, armId, msgFile, ...rest] = process.argv.slice(2);
const arm = ARMS[armId];
if (!name || !arm || !msgFile) throw new Error('usage: node turn.mjs <name> <va|vb|ca|cb> <message-file> [--reply] [--continues N] [--timeout-min M]');
const opt = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d; };
const reply = rest.includes('--reply');
const root = path.join(LAB, 'own037', name);
fs.mkdirSync(path.dirname(root), { recursive: true });
const common = [root, path.resolve(msgFile), '--arm', 'nodegx', '--kit-dir', path.join(KITS, arm.kit),
  '--continues', opt('--continues', '0'), '--timeout-min', opt('--timeout-min', '120'), ...(reply ? ['--reply'] : [])];

let tap = null;
let args;
if (arm.harness === 'vibe') {
  args = [path.join(HERE, '../own-026/round-vibe.mjs'), ...common, '--vibe', '3.0.4', '--key', 'vibe', '--max-usd', 'none'];
} else {
  const port = await freePort(48700);
  const tapDir = `${root}-tap`;
  tap = spawn(process.execPath, [path.join(HERE, '../own-020/stream-tap.mjs'), String(port), tapDir, '--mode', 'retry'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 1000));
  args = [path.join(HERE, '../own-026/round.mjs'), ...common, '--model', MODEL_CLINE, '--tap', String(port)];
}
const t0 = new Date().toISOString();
const run = spawn('nice', ['-n', '10', process.execPath, ...args], { stdio: 'inherit' });
const code = await new Promise((r) => run.on('close', r));
if (tap) tap.kill('SIGTERM');
fs.appendFileSync(path.join(HERE, 'turns.log'), `${t0} ${name} ${armId} ${path.basename(msgFile)}${reply ? ' reply' : ''} exit ${code}\n`);
process.exit(code ?? 1);

async function freePort(from) {
  for (let p = from; p < from + 100; p++) {
    const ok = await new Promise((r) => { const s = net.createServer().once('error', () => r(false)).once('listening', () => s.close(() => r(true))).listen(p, '127.0.0.1'); });
    if (ok) return p;
  }
  throw new Error(`no free port from ${from}`);
}
