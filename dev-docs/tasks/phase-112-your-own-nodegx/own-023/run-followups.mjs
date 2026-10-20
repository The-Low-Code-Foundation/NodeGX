// OWN-023 §4.3: F1–F4 on every arm, each a FRESH stranger (round-arm.mjs --from) on a COPY of the arm's folder as
// built, with the same seal, relay (N = 5) and cap ($60) as the builds. One at a time; by follow-up, then arm, so the
// three arms of one follow-up run close together. The sentences are followups/F<n>-*.txt verbatim; F3's <TITLE>/<N>
// come from f3-numbers.json (a real song and the count that arm's app shows), F4's <BRIEF> is brief.txt's paragraph.
// The gallery must be stopped first (`serve-apps.mjs stop`): B's backend port is fixed at 8584 in its copy too.
//   node run-followups.mjs <followups-dir> <gallery-rounds-dir> [F1 F3 …] [--arms A,B]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const [dirArg, roundsArg, ...rest] = process.argv.slice(2);
const dir = path.resolve(dirArg);
const rounds = path.resolve(roundsArg);
const armsAt = rest.indexOf('--arms');
const arms = (armsAt >= 0 ? rest[armsAt + 1].split(',') : ['A', 'Aplus', 'B']);
const only = rest.filter((x, i) => /^F\d$/.test(x) && (armsAt < 0 || i !== armsAt + 1));
const FLAGS = { A: ['--bare'], Aplus: ['--harness', path.join(HERE, 'harness', 'CLAUDE.md')], B: ['--nodegx', '0.2.2', '--warm-server'] };
const sentence = (F) => fs.readFileSync(path.join(HERE, 'followups', fs.readdirSync(path.join(HERE, 'followups')).find((f) => f.startsWith(`${F}-`))), 'utf8').trim();
const paragraph = fs.readFileSync(path.join(HERE, 'brief.txt'), 'utf8').trim().split(/\n\s*\n/)[0].trim();
const f3 = (() => { try { return JSON.parse(fs.readFileSync(path.join(HERE, 'followups', 'f3-numbers.json'), 'utf8')); } catch { return {}; } })();
fs.mkdirSync(dir, { recursive: true });
const log = path.join(dir, 'followups.json');
const done = fs.existsSync(log) ? JSON.parse(fs.readFileSync(log, 'utf8')) : [];

for (const F of ['F1', 'F2', 'F3', 'F4']) {
  if (only.length && !only.includes(F)) continue;
  for (const arm of arms) {
    const root = path.join(dir, `${arm}-${F}`);
    if (fs.existsSync(root)) { console.log(`${arm}-${F}: exists, skipped`); continue; }
    let text = sentence(F);
    if (F === 'F3') {
      if (!f3[arm]) throw new Error(`F3 needs f3-numbers.json → ${arm}: { title, n }`);
      text = text.replace('<TITLE>', f3[arm].title).replace('<N>', String(f3[arm].n));
    }
    if (F === 'F4') text = text.replace('<BRIEF>', paragraph);
    const promptFile = path.join(dir, `${arm}-${F}.prompt.txt`);
    fs.writeFileSync(promptFile, text + '\n');
    const deny = [rounds, ...['A', 'Aplus', 'B'].flatMap((a) => ['F1', 'F2', 'F3', 'F4'].map((f) => path.join(dir, `${a}-${f}`)))].filter((d) => d !== root);
    const started = new Date().toISOString();
    const code = await new Promise((resolve) => {
      const out = fs.openSync(path.join(dir, `${arm}-${F}.log`), 'a');
      spawn(process.execPath, [path.join(HERE, 'round-arm.mjs'), root, promptFile, ...FLAGS[arm], '--from', path.join(rounds, arm),
        '--continues', '5', '--cap', '60', ...deny.flatMap((d) => ['--deny', d])], { stdio: ['ignore', out, out] }).on('exit', resolve);
    });
    let result = null;
    try { result = JSON.parse(fs.readFileSync(path.join(root, 'arm.json'), 'utf8')); } catch {}
    done.push({ arm, F, started, ended: new Date().toISOString(), exit: code, stop: result?.stop, usd: result?.usd, seconds: result?.seconds, continues: result?.continues, leaks: result?.leaks });
    fs.writeFileSync(log, JSON.stringify(done, null, 2) + '\n');
    console.log(`${arm}-${F}: exit ${code} ${result?.stop} $${result?.usd}`);
  }
}
