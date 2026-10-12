#!/usr/bin/env node
/**
 * CG-006 s3 — re-run rung 9 (G1 "no letter e", ruling 2) and the six promoted moments (rungs 13–18: E3 E4 E5 E8 E9
 * E10) against the REAL model, through the SHIPPED table and the SHIPPED exam: the probes are `exam.js`'s own entries,
 * the table is `olive-templates.json` unmerged, the grading is `runExam` (the same majority, the same 🎓 / mixed
 * verdicts the game's exam gate reads). Plain node, no TS bundle. PREPARED by lane CONTENT; the orchestrator runs it.
 *
 *   node probe-cg006.mjs --repo <checkout> [--cpu] [--model <gguf>] [--out <json>]
 *   node probe-cg006.mjs --repo <checkout> --stub     # the wiring only: the stub Olive (the readout), no model, ~1 s
 *
 * Exit 0 when all seven rungs pass (each offered by the gate), 1 when any is withheld, 2 with no model.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const argv = process.argv.slice(2);
const opt = (n) => (argv.indexOf(n) >= 0 ? argv[argv.indexOf(n) + 1] : null);
const REPO = path.resolve(opt('--repo') || '.');
const CPU = argv.includes('--cpu');
const STUB = argv.includes('--stub');
const SHELL = path.join(REPO, 'dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/shell');
const config = require(path.join(SHELL, 'garden.json'));
const templates = require(path.join(SHELL, 'olive-templates.json'));
const shellRequire = createRequire(path.join(SHELL, 'package.json'));
const { createOwl } = shellRequire('./owl.js');
const { createOliveDoors } = shellRequire('./olive-route.js');
const { PROBES, runExam, withheldRungs } = shellRequire('./exam.js');
const MODEL = STUB ? path.join(SHELL, 'olive-stub.js') : path.resolve(opt('--model') || process.env.GARDEN_MODEL_PATH || path.join(SHELL, 'build-output', 'model', config.model.file));
const OUT = opt('--out');

/** The rungs this run decides, with the moment each was promoted from. */
const RUNGS = { 'no-letter-e': 'rung 9 (G1)', 'explain-program': 'E3 → 13', 'narrate-run': 'E4 → 14', 'name-trick': 'E5 → 15', 'sort-words': 'E8 → 16', define: 'E9 → 17', letter: 'E10 → 18' };

async function main() {
  if (!fs.existsSync(MODEL)) {
    console.error('probe-cg006: no model at ' + MODEL);
    process.exit(2);
  }
  const probes = PROBES.filter((p) => p.rung in RUNGS);
  const log = (l) => console.log('  · ' + l);
  const engine = STUB ? shellRequire('./olive-stub.js').createStubEngine() : undefined;
  const owl = createOwl({ modelPath: MODEL, engine, gpu: !CPU, threads: config.olive.cpuThreads, timeoutMs: config.olive.timeoutMs, contextSize: config.olive.contextSize, log });
  const doors = createOliveDoors({ owl, templates, dataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'cg006-probes-')), header: config.header, prefix: config.doorPrefix, log });
  const s0 = await owl.load();
  console.log(`probe-cg006: model ${s0.model} on ${s0.gpu} in ${s0.loadMs} ms (${CPU ? 'CPU, ' + config.olive.cpuThreads + ' threads' : 'GPU if available'}); ${probes.length} probes on ${Object.keys(RUNGS).length} rungs`);
  if (s0.model !== 'ready') process.exit(1);
  const res = await runExam({ ask: doors.ask, probes });
  console.log('\n| probe | rung | lang | mode | met | pass | ms | replies |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const p of res.probes) {
    const shown = p.replies.map((r) => (r.ok ? JSON.stringify(r.value !== undefined ? r.value : r.text) : '⟂ ' + r.reason)).join(' / ').replace(/\|/g, '¦').slice(0, 150);
    console.log(`| ${p.id} | ${p.rung} | ${p.lang} | ${p.mode} | ${p.met ? 'met' : 'not met'} (${p.replies.length} samples) | ${p.mode === 'record' ? 'recorded' : p.pass ? '✅' : '❌'} | ${p.ms} | ${shown} |`);
  }
  console.log('\n| rung | from | ladder | verdict | probes |');
  console.log('|---|---|---|---|---|');
  for (const [id, from] of Object.entries(RUNGS)) {
    const r = res.rungs[id];
    console.log(`| ${id} | ${from} | ${r.verdict === 'mixed' ? 'mixed' : r.ladder === 'fail' ? '🎓' : '✅'} | ${r.pass ? 'OFFERED' : 'WITHHELD'} | ${r.probes.join(' ')} |`);
  }
  const held = withheldRungs(res).filter((id) => id in RUNGS);
  console.log(`\nprobe-cg006: ${Object.keys(RUNGS).length - held.length}/${Object.keys(RUNGS).length} rungs offered${held.length ? ' — WITHHELD: ' + held.join(', ') : ''}; ${res.passed}/${res.passed + res.failed} asserted probes as designed; ${res.ms} ms`);
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), cpu: CPU, model: MODEL, gpu: s0.gpu, ...res, withheld: held }, null, 2));
  await owl.close();
  process.exit(held.length ? 1 : 0);
}
main().catch((e) => {
  console.error('probe-cg006: ' + (e.stack || e.message));
  process.exit(1);
});
