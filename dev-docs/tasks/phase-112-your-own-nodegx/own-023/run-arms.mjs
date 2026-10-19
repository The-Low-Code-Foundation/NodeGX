// OWN-023 §4.1 order: A, then A+, then B, back to back, one at a time (memory: one heavy job on this box). R10
// (Richard, 2026-10-19): wait for the machine to be quiet before each arm — no ffmpeg running and the CPU at least
// QUIET_IDLE % idle — so one arm's wall time isn't measured under another job's load. The idle reading at each start is
// written to chain.json beside the arm's own per-sitting load averages.
//   node run-arms.mjs <rounds-dir>      (rounds-dir/A, Aplus, B; each must not exist yet)
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const rounds = path.resolve(process.argv[2]);
const IDLE = Number(process.env.QUIET_IDLE || 60);
const SCRATCH = path.dirname(rounds);
const ARMS = [
  { name: 'A', args: ['--bare'] },
  { name: 'Aplus', args: ['--harness', path.join(HERE, 'harness', 'CLAUDE.md')] },
  { name: 'B', args: ['--nodegx', '0.2.2', '--warm-server'] }
];
const only = process.argv.slice(3);
const chainFile = path.join(rounds, 'chain.json');
fs.mkdirSync(rounds, { recursive: true });
const chain = fs.existsSync(chainFile) ? JSON.parse(fs.readFileSync(chainFile, 'utf8')) : [];
const save = () => fs.writeFileSync(chainFile, JSON.stringify(chain, null, 2) + '\n');

const idle = () => {
  const lines = execFileSync('top', ['-l', '2', '-n', '0', '-s', '3'], { encoding: 'utf8' }).split('\n').filter((l) => l.startsWith('CPU usage'));
  return Number((lines.at(-1).match(/([\d.]+)% idle/) || [])[1] ?? 0);
};
const ffmpeg = () => { try { return execFileSync('pgrep', ['-x', 'ffmpeg'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean).length; } catch { return 0; } };

for (const arm of ARMS) {
  if (only.length && !only.includes(arm.name)) continue;
  const root = path.join(rounds, arm.name);
  if (fs.existsSync(root)) { console.log(`${arm.name}: exists, skipped`); continue; }
  const waitFrom = Date.now();
  for (let quiet = 0; quiet < 2;) {
    const f = ffmpeg(), i = idle();
    quiet = f === 0 && i >= IDLE ? quiet + 1 : 0;
    console.log(`${new Date().toISOString()} ${arm.name}: waiting for quiet — ffmpeg ${f}, idle ${i}% (${quiet}/2)`);
    if (quiet < 2) await new Promise((r) => setTimeout(r, 60000));
  }
  const entry = { arm: arm.name, waitedMin: Math.round((Date.now() - waitFrom) / 60000), startedAt: new Date().toISOString(), idleAtStart: idle() };
  chain.push(entry);
  save();
  const deny = ARMS.filter((a) => a.name !== arm.name).map((a) => path.join(rounds, a.name))
    .concat(['harness', 'checklist-outside'].map((d) => path.join(SCRATCH, d)));
  const args = [path.join(HERE, 'round-arm.mjs'), root, path.join(HERE, 'brief.txt'), ...arm.args, '--continues', '5', '--cap', '60', ...deny.flatMap((d) => ['--deny', d])];
  const code = await new Promise((resolve) => {
    const log = fs.openSync(path.join(rounds, `${arm.name}.log`), 'a');
    spawn(process.execPath, args, { stdio: ['ignore', log, log] }).on('exit', resolve);
  });
  Object.assign(entry, { exit: code, endedAt: new Date().toISOString() });
  try { entry.result = JSON.parse(fs.readFileSync(path.join(root, 'arm.json'), 'utf8')); } catch {}
  save();
  console.log(`${arm.name}: exit ${code} ${JSON.stringify(entry.result ?? {})}`);
}
