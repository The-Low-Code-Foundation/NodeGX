#!/usr/bin/env node
/**
 * CG-006 AC2/AC6 — run the §4 moment probes and the two rulings' probes against the REAL model, through the shell's
 * own checks (olive-check.js via olive-route.js's ask), with the shell's rung table MERGED with cg006Probes.ts's
 * proposed rungs. Grades with cg006Probes.meets (it knows `lacks`/`containsAll`; exam.js does not yet), majority of
 * `times` (3) like exam.js, and prints decide() per moment. PREPARED by lane B; the orchestrator runs it.
 *
 *   node probe-cg006.mjs --repo <checkout> --probes <cg006Probes.cjs> [--cpu] [--model <gguf>] [--out <json>]
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const argv = process.argv.slice(2);
const opt = (n) => (argv.indexOf(n) >= 0 ? argv[argv.indexOf(n) + 1] : null);
const REPO = opt('--repo');
const CPU = argv.includes('--cpu');
const SHELL = path.join(REPO, 'dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/shell');
const config = require(path.join(SHELL, 'garden.json'));
const base = require(path.join(SHELL, 'olive-templates.json'));
const shellRequire = createRequire(path.join(SHELL, 'package.json'));
const { createOwl } = shellRequire('./owl.js');
const { createOliveDoors } = shellRequire('./olive-route.js');
const P = require(path.resolve(opt('--probes')));
const MODEL = path.resolve(opt('--model') || process.env.GARDEN_MODEL_PATH || path.join(SHELL, 'build-output', 'model', config.model.file));
const OUT = opt('--out');

async function main() {
  if (!fs.existsSync(MODEL)) { console.error('probe-cg006: no model at ' + MODEL); process.exit(2); }
  const templates = P.mergeTemplates(base);
  const log = (l) => console.log('  · ' + l);
  const owl = createOwl({ modelPath: MODEL, gpu: !CPU, threads: config.olive.cpuThreads, timeoutMs: config.olive.timeoutMs, contextSize: config.olive.contextSize, log });
  const doors = createOliveDoors({ owl, templates, dataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'cg006-probes-')), header: config.header, prefix: config.doorPrefix, log });
  const s0 = await owl.load();
  console.log(`probe-cg006: model ${s0.model} on ${s0.gpu} in ${s0.loadMs} ms (${CPU ? 'CPU' : 'GPU if available'})`);
  if (s0.model !== 'ready') process.exit(1);
  const rows = [];
  console.log('\n| probe | moment | rung | lang | mode | column | met | pass | replies |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const p of P.PROBES) {
    const replies = [];
    const times = p.times || 3;
    const t0 = Date.now();
    while (replies.length < times) replies.push(await doors.ask({ rung: p.rung, slots: p.slots, lang: p.lang, shape: p.shape, temperature: p.temperature }));
    const met = P.majority(p.expect, replies);
    const pass = p.mode === 'fail' ? !met : met;
    const perReply = replies.map((r) => P.meets(p.expect, r));
    const row = { id: p.id, moment: p.moment, rung: p.rung, lang: p.lang, mode: p.mode, column: p.column, met, pass, metCount: perReply.filter(Boolean).length, samples: replies.length, ms: Date.now() - t0, replies };
    rows.push(row);
    const shown = replies.map((r) => (r.ok ? JSON.stringify(r.value !== undefined ? r.value : r.text) : '⟂ ' + r.reason)).join(' / ').replace(/\|/g, '¦').slice(0, 140);
    console.log(`| ${p.id} | ${p.moment} | ${p.rung} | ${p.lang} | ${p.mode} | ${p.column} | ${row.metCount}/${row.samples} | ${p.mode === 'record' ? 'recorded' : pass ? '✅' : '❌'} | ${shown} |`);
  }
  console.log('\n| moment | status | column | decision |');
  console.log('|---|---|---|---|');
  const decisions = {};
  for (const m of P.MOMENTS) {
    decisions[m.id] = P.decide(m, rows);
    console.log(`| ${m.id} | ${m.status} | ${m.column} | ${decisions[m.id]} |`);
  }
  const ruling = (ids) => ids.map((id) => rows.find((r) => r.id === id)).map((r) => `${r.id} ${r.pass ? 'as designed' : 'NOT as designed'} (${r.metCount}/${r.samples} kept the rule)`).join('; ');
  console.log('\nrung 9 G1: ' + ruling(['R9-G1-fr', 'R9-G1-en']));
  console.log('rung 9 G2: ' + ruling(['R9-G2-fr', 'R9-G2-en']));
  console.log('thank-you EN A (wide): ' + ruling(['TY-A-en']) + ' | B (none): ' + ruling(['TY-B-en']));
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), cpu: CPU, model: MODEL, rows, decisions }, null, 2));
  await owl.close();
  process.exit(0);
}
main().catch((e) => { console.error('probe-cg006: ' + (e.stack || e.message)); process.exit(1); });
