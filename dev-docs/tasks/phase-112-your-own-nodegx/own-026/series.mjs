// OWN-026: run a series one job at a time (memory: one heavy job), each round through the stream tap, each graded
// straight after. Re-runnable: a round with round.json, or a grade with meta.json, is skipped.
//
//   node series.mjs t1                     test 1: 9 rounds, order code, harness, nodegx ×3 (PLAN.md §3)
//   node series.mjs t2 <arm> <start-round> test 2: changes c01…c10 on one arm's chain (PLAN.md §4)
//   [--only <round-id>] [--no-grade]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const LAB = '/Users/Shared/nodegx-lab';
const ROUNDS = path.join(LAB, 'own026');
const GRADES = path.join(LAB, 'own026-grades');
const [which, ...rest] = process.argv.slice(2);
const opt = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : dflt; };
const LOG = path.join(ROUNDS, `series-${which}.log`);
const log = (s) => { const line = `${new Date().toISOString()} ${s}`; console.log(line); fs.appendFileSync(LOG, line + '\n'); };
const run = (cmd, args, out) => new Promise((resolve) => {
  const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const f = fs.createWriteStream(out, { flags: 'a' });
  p.stdout.pipe(f); p.stderr.pipe(f);
  p.on('close', resolve);
});

const T1_IDS = 'S0,F1,F2,F3,F4,F5,F6,F7,F8,T1,T2,T3,T4,T5,T6,T7,T8,T9,T10,T11,T12,T13';
const C_IDS = { 1: ['C1.1', 'C1.2'], 2: ['C2.1', 'C2.2'], 3: ['C3.1', 'C3.2'], 4: ['C4.1', 'C4.2', 'C4.3'], 5: ['C5.1', 'C5.2', 'C5.3'],
  6: ['C6.1', 'C6.2'], 7: ['C7.1', 'C7.2'], 8: ['C8.1', 'C8.2'], 9: ['C9.1', 'C9.2'], 10: ['C10.1', 'C10.2'] };
const t2Ids = (n) => ['S0', ...C_IDS[n], 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'T1', 'T4', 'T6', 'T7', ...Array.from({ length: n - 1 }, (_, i) => C_IDS[i + 1]).flat()].join(',');

let jobs;
if (which === 't1') {
  jobs = [1, 2, 3].flatMap((k) => ['code', 'harness', 'nodegx'].map((arm) => ({ id: `t1-${arm}-${k}`, arm, request: path.join(HERE, 'request-build.txt'), ids: T1_IDS })));
} else if (which === 't2') {
  const [arm, start] = rest;
  if (!['code', 'harness', 'nodegx'].includes(arm) || !start) throw new Error('usage: node series.mjs t2 <arm> <start-round-id>');
  let seed = path.join(ROUNDS, start);
  jobs = [];
  for (let n = 1; n <= 10; n++) {
    const id = `t2-${arm}-c${String(n).padStart(2, '0')}`;
    // the grader reads the whole history the person asked for: the build, then every change so far, in order
    const history = path.join(GRADES, `${id}-request.txt`);
    fs.mkdirSync(GRADES, { recursive: true });
    fs.writeFileSync(history, [fs.readFileSync(path.join(HERE, 'request-build.txt'), 'utf8').trim(),
      ...Array.from({ length: n }, (_, i) => `Later, change ${i + 1}:\n` + fs.readFileSync(path.join(HERE, 'changes', `c${String(i + 1).padStart(2, '0')}.txt`), 'utf8').trim())].join('\n\n') + '\n');
    jobs.push({ id, arm, seed, request: path.join(HERE, 'changes', `c${String(n).padStart(2, '0')}.txt`), gradeRequest: history, ids: t2Ids(n) });
    seed = path.join(ROUNDS, id);
  }
} else throw new Error('usage: node series.mjs t1 | t2 <arm> <start-round-id>');

const only = opt('--only', null);
let port = 48900;
for (const j of jobs) {
  if (only && j.id !== only) continue;
  const root = path.join(ROUNDS, j.id);
  if (!fs.existsSync(path.join(root, 'round.json'))) {
    if (fs.existsSync(root)) { log(`${j.id}: an unfinished root is there; move it aside by hand and re-run`); process.exit(1); }
    const tapDir = path.join(ROUNDS, `${j.id}-tap`);
    fs.mkdirSync(tapDir, { recursive: true });
    const p = port++;
    const tap = spawn('node', [path.join(HERE, '../own-020/stream-tap.mjs'), String(p), tapDir, '--mode', 'retry'], { stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 1000));
    log(`${j.id}: round start (arm ${j.arm}${j.seed ? `, seed ${path.basename(j.seed)}` : ''}, tap ${p})`);
    const code = await run('nice', ['-n', '10', 'node', path.join(HERE, 'round.mjs'), root, j.request, '--arm', j.arm, '--tap', String(p), ...(j.seed ? ['--seed', j.seed] : [])], path.join(ROUNDS, `${j.id}.out`));
    tap.kill();
    const r = fs.existsSync(path.join(root, 'round.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'round.json'), 'utf8')) : null;
    log(`${j.id}: round end exit ${code} ${r ? `${r.finish} judge ${r.judge} sittings ${r.sittings} ${r.seconds}s $${r.usdAtClinePassPrices} audit ${r.audit}` : '(no round.json)'}`);
    if (!r) process.exit(1);
  }
  if (rest.includes('--no-grade')) continue;
  const g = path.join(GRADES, j.id);
  if (fs.existsSync(path.join(g, 'meta.json'))) continue;
  if (fs.existsSync(g)) { log(`${j.id}: an unfinished grade is there; move it aside by hand and re-run`); process.exit(1); }
  log(`${j.id}: grade start (${j.ids.split(',').length} checks)`);
  await run('nice', ['-n', '10', 'node', path.join(HERE, 'grade.mjs'), root, g, '--ids', j.ids, '--request', j.gradeRequest ?? j.request], path.join(GRADES, `${j.id}.out`));
  const m = fs.existsSync(path.join(g, 'meta.json')) ? JSON.parse(fs.readFileSync(path.join(g, 'meta.json'), 'utf8')) : null;
  log(`${j.id}: grade end ${m ? `pass ${m.pass} fail ${m.fail} not reached ${m.notReached} · ${m.seconds}s $${m.usd} 7-day ${m.sevenDay}` : '(no meta.json)'}`);
}
log('series done');
