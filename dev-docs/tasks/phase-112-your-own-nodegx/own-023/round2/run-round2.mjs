// OWN-023 round 2 (the gala): A+, then B, back to back, one at a time, each after the machine is quiet (round 1's R10:
// no ffmpeg, the CPU at least QUIET_IDLE % idle twice a minute apart). Same model, same relay (5 continues), same cap
// for both ($100, Richard 2026-10-21). Arm A is the game as it is: it is not rebuilt.
//   node run-round2.mjs <rounds-dir> <seeds-dir> <harness CLAUDE.md> [Aplus|B]…
// rounds-dir/Aplus and rounds-dir/B must not exist yet; seeds-dir comes from make-seeds.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const LAB = path.dirname(HERE);
const [roundsArg, seedsArg, harnessArg, ...only] = process.argv.slice(2);
if (!roundsArg || !seedsArg || !harnessArg) throw new Error('usage: node run-round2.mjs <rounds-dir> <seeds-dir> <harness CLAUDE.md> [Aplus|B|B2]…');
const rounds = path.resolve(roundsArg), seeds = path.resolve(seedsArg), harness = path.resolve(harnessArg);
const IDLE = Number(process.env.QUIET_IDLE || 60), CAP = '100', CONTINUES = '5', KIT = '0.2.4';
const ARMS = [
  { name: 'Aplus', brief: path.join(seeds, 'brief-Aplus.txt'), args: ['--harness', harness, '--seed', path.join(seeds, 'Aplus')] },
  { name: 'B', brief: path.join(seeds, 'brief-B.txt'), args: ['--nodegx', KIT, '--warm-server', '--seed', path.join(seeds, 'B')] },
  // round 2b (Richard 2026-10-21): B wrapped the old game in one page; B2 gets the same seed, a strict conversion rule and
  // a conversion log (brief-B2.txt). A+ stays the control.
  { name: 'B2', brief: path.join(seeds, 'brief-B2.txt'), args: ['--nodegx', KIT, '--warm-server', '--seed', path.join(seeds, 'B')] },
];
// more roots the arm may not see, colon-separated (round 2b: round 2's whole folder, B's wrapped build included)
const EXTRA_DENY = (process.env.DENY || '').split(':').filter(Boolean).map((d) => path.resolve(d));
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
  chain.push(entry); save();
  // each arm is fenced off from the other arm's root, the seeds and the harness writer's folder
  const deny = [...ARMS.filter((a) => a.name !== arm.name).map((a) => path.join(rounds, a.name)), seeds, path.dirname(harness), ...EXTRA_DENY];
  const args = [path.join(LAB, 'round-arm.mjs'), root, arm.brief, ...arm.args, '--app', 'gala', '--continues', CONTINUES, '--cap', CAP, ...deny.flatMap((d) => ['--deny', d])];
  const code = await new Promise((resolve) => {
    const log = fs.openSync(path.join(rounds, `${arm.name}.log`), 'a');
    spawn(process.execPath, args, { stdio: ['ignore', log, log] }).on('exit', resolve);
  });
  Object.assign(entry, { exit: code, endedAt: new Date().toISOString() });
  try { entry.result = JSON.parse(fs.readFileSync(path.join(root, 'arm.json'), 'utf8')); } catch {}
  save();
  console.log(`${arm.name}: exit ${code} ${JSON.stringify(entry.result ?? {})}`);
}
