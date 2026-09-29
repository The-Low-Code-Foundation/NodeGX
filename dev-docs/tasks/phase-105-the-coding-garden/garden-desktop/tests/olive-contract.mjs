#!/usr/bin/env node
/**
 * Olive's contract test (P105 CG-004 AC2, AC3, AC7; CG-005 AC1/AC7 lean on it): the exam run against the shell's route
 * with the REAL model, through owl.js and olive-route.js on a relay in plain node — no Electron.
 *
 *   node dev-docs/tasks/phase-105-the-coding-garden/garden-desktop/tests/olive-contract.mjs [--cpu] [--model <gguf>] [--out <json>]
 *
 * The model: `--model`, else GARDEN_MODEL_PATH, else shell/build-output/model/<garden.json model.file> (fetch-model.mjs
 * puts it there). `--cpu` forces gpu:false with garden.json's cpuThreads (what CI on Linux and the tablet run).
 *
 * Green = the dial holds in FR and EN (CG-005 AC7: two runs at 0 the same name, three at 1.2 at least two names), every ✅ probe met its expectation, every 🎓 probe was recorded as FAILING (the ladder is built on it),
 * status answered under 1 s while a completion ran, and timings.log carries model-load / exam-probe / olive lines.
 * Recorded probes (mode 'record') are printed, never asserted (the mixed rung, define, is graded on its recorded set).
 * Since P106 IG-006 the exam carries the three blocks (say, read, is it a…? — the last two SCORED: read ≥ 5/6, is it a…?
 * ≥ 15/18 over C1's table) and the five lessons; P02 (the EN thank-you) has no must-contain to miss (Richard's ruling 3). Exit 1 otherwise. Correctness, not timing: the ms are
 * printed for the task file, never asserted.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHELL = path.join(HERE, '..', 'shell');
const config = require(path.join(SHELL, 'garden.json'));
const templates = require(path.join(SHELL, 'olive-templates.json'));
const { createOwl } = require(path.join(SHELL, 'owl.js'));
const { createOliveDoors } = require(path.join(SHELL, 'olive-route.js'));
const { createRelay } = require(path.join(SHELL, 'relay.js'));
const { createTimings } = require(path.join(SHELL, 'timings.js'));
const { checkModel } = require(path.join(SHELL, 'model-check.js'));

const argv = process.argv.slice(2);
const opt = (n) => (argv.indexOf(n) >= 0 ? argv[argv.indexOf(n) + 1] : null);
const CPU = argv.includes('--cpu');
const MODEL = path.resolve(opt('--model') || process.env.GARDEN_MODEL_PATH || path.join(SHELL, 'build-output', 'model', config.model.file));
const OUT = opt('--out');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'garden-contract-'));
const timings = createTimings(path.join(dataDir, 'logs', 'timings.log'));
const log = (l) => console.log(`  · ${l}`);
const H = { [config.header]: '1', 'content-type': 'application/json' };

function request(port, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const req = http.request({ host: '127.0.0.1', port, method, path: urlPath, headers: body ? H : {} }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null, ms: Date.now() - t0 }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const R = { at: new Date().toISOString(), model: MODEL, cpu: CPU, node: process.version, platform: `${process.platform}-${process.arch}` };
  if (!fs.existsSync(MODEL)) {
    console.error(`olive-contract: no model at ${MODEL} (run fetch-model.mjs, or --model <gguf>)`);
    process.exit(2);
  }
  console.log(`olive-contract: ${CPU ? `CPU, ${config.olive.cpuThreads} threads` : 'GPU if available'} — ${MODEL}`);
  const check = await checkModel({ file: MODEL, expected: config.model.sha256, dataDir, log });
  R.sha256 = check;
  if (!check.ok) {
    console.error(`olive-contract: the model is refused (${check.reason})`);
    process.exit(1);
  }
  const owl = createOwl({ modelPath: MODEL, gpu: !CPU, threads: config.olive.cpuThreads, timeoutMs: config.olive.timeoutMs, contextSize: config.olive.contextSize, log, timings });
  const olive = createOliveDoors({ owl, templates, dataDir, header: config.header, prefix: config.doorPrefix, timings, log });
  const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'garden-contract-app-'));
  fs.writeFileSync(path.join(appDir, 'index.html'), '<html></html>');
  const relay = createRelay({ appDir, backendPort: () => null, shell: (q, s, p) => olive.handle(q, s, p) });
  await new Promise((r) => relay.listen(0, '127.0.0.1', r));
  const port = relay.address().port;
  const P = config.doorPrefix + 'olive';

  const s0 = await owl.load();
  R.load = { model: s0.model, gpu: s0.gpu, loadMs: s0.loadMs, reason: s0.reason };
  console.log(`olive-contract: model ${s0.model} on ${s0.gpu} in ${s0.loadMs} ms`);
  if (s0.model !== 'ready') process.exit(1);

  // AC3: status while a completion runs. A 48-token thank-you is the longest ask left (IG-006); fire it, then read status.
  const inflight = request(port, 'POST', P, { rung: 'say-thanks', slots: { to: 'Mamie Rose', deed: 'arrosé ses trois tulipes' }, lang: 'fr' });
  await new Promise((r) => setTimeout(r, 150));
  const st = await request(port, 'GET', P + '/status');
  const poem = await inflight;
  R.statusDuringCompletion = { ms: st.ms, busy: st.body.busy, model: st.body.model, poemMs: poem.body.ms, poemOk: poem.body.ok };
  console.log(`olive-contract: status during a completion: ${st.ms} ms (busy=${st.body.busy}); the poem took ${poem.body.ms} ms`);

  // CG-005 AC7: the dial on the real model, through the route, in BOTH languages. "Same every time" is the dial's
  // temperature 0 (cg002Scripts DIAL_TEMPERATURE[0]); "surprise me" is 1.2 (DIAL_TEMPERATURE[2]). Two runs at 0 give the
  // same line; three runs at 1.2 give at least two different lines among the answers the checks let through. IG-006:
  // on the thank-you (the `say` block; name-one was cut with the other twelve rungs).
  R.dial = {};
  for (const lang of ['fr', 'en']) {
    const slots = { to: 'Mamie Rose', deed: templates.lists.deeds[lang][0] };
    const ask = async (temperature) => (await request(port, 'POST', P, { rung: 'say-thanks', slots, lang, temperature })).body;
    const same = [await ask(0), await ask(0)];
    const wild = [await ask(1.2), await ask(1.2), await ask(1.2)];
    const okWild = wild.filter((x) => x.ok).map((x) => JSON.stringify(x.value));
    const sameOk = same.every((x) => x.ok) && new Set(same.map((x) => JSON.stringify(x.value))).size === 1;
    const wildOk = new Set(okWild).size >= 2;
    R.dial[lang] = { same: same.map((x) => (x.ok ? x.value : `⟂ ${x.reason}`)), surprise: wild.map((x) => (x.ok ? x.value : `⟂ ${x.reason}`)), sameOk, wildOk };
    console.log(`olive-contract: AC7 dial ${lang}: same every time ${JSON.stringify(R.dial[lang].same)} ${sameOk ? 'ok' : 'NOT SAME'}; surprise me ${JSON.stringify(R.dial[lang].surprise)} ${wildOk ? 'ok' : 'NOT VARIED'}`);
  }
  const dialGreen = Object.values(R.dial).every((d) => d.sameOk && d.wildOk);

  // AC2: the exam through the route.
  const exam = await request(port, 'POST', P + '/exam', {});
  const res = exam.body;
  R.exam = res;
  console.log('');
  console.log('| probe | from | rung | mode | met | pass | ms | reply |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const p of res.probes) {
    const reply = p.replies.map((r) => (r.value !== undefined ? JSON.stringify(r.value) : r.text !== undefined ? JSON.stringify(r.text) : `⟂ ${r.reason}`)).join(' / ');
    // (IG-006: a scored rung's probes are graded on the rung's count below, not one by one.)
    console.log(`| ${p.id} | ${p.from} | ${p.rung} ${p.lang} | ${p.mode} | ${p.met ? 'met' : 'not met'} | ${p.mode === 'record' ? 'recorded' : p.pass ? '✅' : '❌'} | ${p.ms} | ${reply.replace(/\|/g, '¦').slice(0, 110)} |`);
  }
  console.log('');
  console.log('| rung | ladder | verdict | probes |');
  console.log('|---|---|---|---|');
  for (const [id, r] of Object.entries(res.rungs)) console.log(`| ${id} | ${r.ladder === 'fail' ? '🎓' : '✅'} | ${r.pass ? 'pass' : 'FAIL'}${r.score ? ` ${r.score.met}/${r.score.of} (≥ ${r.score.min})` : ''} | ${r.probes.join(' ')} |`);
  // IG-006 AC4: the two counts, for the task file.
  R.scores = Object.fromEntries(Object.entries(res.rungs).filter(([, r]) => r.score).map(([id, r]) => [id, r.score]));
  console.log(`olive-contract: IG-006 AC4 ${Object.entries(R.scores).map(([id, sc]) => `${id} ${sc.met}/${sc.of} (≥ ${sc.min})`).join(' · ')}`);
  const asserted = res.probes.filter((p) => p.mode !== 'record');
  const perProbe = asserted.map((p) => p.ms);
  R.ms = { min: Math.min(...perProbe), max: Math.max(...perProbe), mean: Math.round(perProbe.reduce((a, b) => a + b, 0) / perProbe.length), exam: res.ms };
  console.log(`\nolive-contract: ${res.passed}/${asserted.length} asserted probes behaved as the ladder says; per probe ${R.ms.min}–${R.ms.max} ms (mean ${R.ms.mean}); exam ${res.ms} ms`);

  // AC7: the log carries the three kinds of line.
  const lines = timings.read();
  const events = lines.reduce((m, l) => ((m[l.event] = (m[l.event] || 0) + 1), m), {});
  R.timings = events;
  console.log(`olive-contract: timings.log ${JSON.stringify(events)} at ${timings.file}`);

  // A probe of a SCORED rung counts through its rung's count (exam.js SCORED); every other asserted probe must pass.
  const scoredIds = new Set(Object.entries(res.rungs).filter(([, r]) => r.score).flatMap(([, r]) => r.probes));
  const failed = asserted.filter((p) => !p.pass && !scoredIds.has(p.id)).concat(Object.entries(res.rungs).filter(([, r]) => r.score && !r.pass).map(([id]) => ({ id: `${id} (count)`, rung: id, mode: 'scored' })));
  const byLang = res.probes.reduce((m, p) => ((m[p.lang] = (m[p.lang] || 0) + 1), m), {});
  R.byLang = byLang;
  console.log(`olive-contract: probes per language ${JSON.stringify(byLang)} (CG-005 AC8: the EN twins nobody measured are recorded; rung 9 and the promoted moments' EN probes, measured in CG-006 §7.1, are asserted)`);
  const green = dialGreen && failed.length === 0 && st.ms < 1000 && events['model-load'] === 1 && events['exam-probe'] >= asserted.length && events.olive >= asserted.length;
  R.verdict = green ? 'PASS' : 'FAIL';
  R.failed = failed.map((p) => p.id);
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(R, null, 2));
  console.log(`olive-contract: ${R.verdict}${failed.length ? ' — ' + failed.map((p) => `${p.id} (${p.rung}, ${p.mode})`).join(', ') : ''}${dialGreen ? '' : ' — AC7 dial'}`);
  relay.close();
  await owl.close();
  process.exit(green ? 0 : 1);
}

main().catch((e) => {
  console.error(`olive-contract: ${e.stack || e.message}`);
  process.exit(1);
});
