/**
 * P112 OWN-003 — the graph scenarios on the real engine IN A PAGE, in headless Chrome.
 *
 * Plays every scenario of `nodegx-node-spec/scenarios/graph/` on `NodegxGraphTarget.graphTarget()` (the bundle
 * `dist/browser/noodl-graph-target.js`; `npm run build` first) exactly as `noodl-runtime/test/node-spec/graph.test.ts`
 * plays it on the Node helper — a fresh engine per scenario, graded by `runGraphScenarios` against the scenario's
 * recorded `expect` (the runtime's trace, recorded in Node) and its claims. Equal traces mean the page's engine sends
 * what the Node engine sent; a difference names the clause.
 *
 *   node scripts/graph-target-check.mjs [--bundle <file>] [--json <out.json>] [--only <substring>]
 *
 * Serves the bundle, the scenario files and a check page on a free loopback port; the page writes its progress into
 * <title> and its results into `window.__gt`, read over CDP. Exits 2 without Chrome or the bundle, 1 when any scenario
 * is not `passed` (or `diverged` where the scenario names this target), 0 otherwise. Prints every scenario that is not
 * passed with the runner's own sentence.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const args = process.argv.slice(2);
const flag = (name) => {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
};
const bundle = flag('--bundle') ?? join(here, '..', 'dist/browser/noodl-graph-target.js');
const jsonOut = flag('--json');
const only = flag('--only');
/** `--types <file>`: every node type the page's engine registers, one per line in a JSON array (the census's "runnable on the engine", OWN-003 AC4). */
const typesOut = flag('--types');
/**
 * `--mutant two-frames`: the CONTROL arm — the same engine with a `settle()` that runs two frames, a runner that is wrong
 * in the one way the task file warns of ("a settle that only drains is not a frame"; here the opposite, and as wrong).
 * The gate must read red on it, or a green run grades nothing. Exits 0 when at least one scenario FAILS.
 */
const mutant = flag('--mutant');
if (mutant !== undefined && mutant !== 'two-frames') {
  console.log(`graph-target-check: unknown mutant ${JSON.stringify(mutant)} — the one known is two-frames`);
  process.exit(2);
}
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const scenariosDir = join(repo, 'packages/nodegx-node-spec/scenarios/graph');
for (const [what, at] of [['Chrome', chrome], ['the graph-target bundle (npm run build)', bundle], ['the graph scenarios', scenariosDir]]) {
  if (!existsSync(at)) {
    console.log(`graph-target-check: no ${what} at ${at}`);
    process.exit(2);
  }
}
const { connect, evaluate } = createRequire(import.meta.url)(join(repo, 'scripts/devtools/cdp.js'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((r) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => r(port)); }); });

const files = readdirSync(scenariosDir).filter((f) => f.endsWith('.json')).sort();

const page = `<!doctype html><meta charset="utf-8"><title>loading</title><script src="/noodl-graph-target.js"></script><script>
const { graphTarget, spec } = NodegxGraphTarget;
const results = [];
window.__gt = { done: false, results, error: null, types: 0, typeNames: [] };
const mutant = ${JSON.stringify(mutant ?? null)};
const make = () => {
  const target = graphTarget();
  if (mutant === 'two-frames') {
    const settle = target.settle.bind(target);
    target.settle = async () => { await settle(); await settle(); };
  }
  return target;
};
(async () => {
  try {
    window.__gt.typeNames = graphTarget().types().sort();
    window.__gt.types = window.__gt.typeNames.length;
    const index = await (await fetch('/scenarios/index.json')).json();
    const only = ${JSON.stringify(only ?? null)};
    for (const file of index) {
      const parsed = await (await fetch('/scenarios/' + file)).json();
      for (const sc of spec.reviveGraphScenarios(parsed, file)) {
        if (only && !sc.name.includes(only) && !file.includes(only)) continue;
        const row = { file, name: sc.name, clauses: sc.clauses };
        try {
          const target = make();
          const report = await spec.runGraphScenarios(target, [sc]);
          const r = report.results[0];
          row.status = r.status; row.timeMs = r.timeMs;
          if (r.reason) row.reason = r.reason;
          if (r.difference) row.difference = spec.formatDifference(r.difference, 'node', 'page');
          if (r.claimFailures && r.claimFailures.length) row.claimFailures = r.claimFailures;
          if (r.status !== 'passed' && r.actual) row.actual = r.actual;
        } catch (e) { row.status = 'threw'; row.reason = String((e && e.stack) || e); }
        results.push(row);
        document.title = 'RUNNING ' + results.length;
      }
    }
  } catch (e) { window.__gt.error = String((e && e.stack) || e); }
  window.__gt.done = true;
  document.title = results.every((r) => r.status === 'passed' || r.status === 'diverged') && !window.__gt.error ? 'PASS' : 'FAIL';
})();
</script>`;

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const send = (type, body) => { res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); res.end(body); };
  if (url === '/') return send('text/html; charset=utf-8', page);
  if (url === '/noodl-graph-target.js') return send('application/javascript', readFileSync(bundle));
  if (url === '/scenarios/index.json') return send('application/json', JSON.stringify(files));
  if (url.startsWith('/scenarios/')) {
    const file = join(scenariosDir, url.slice('/scenarios/'.length));
    if (files.includes(url.slice('/scenarios/'.length))) return send('application/json', readFileSync(file));
  }
  res.writeHead(404); res.end();
});
const port = await freePort();
await new Promise((r) => server.listen(port, '127.0.0.1', r));

const cdpPort = await freePort();
const profile = mkdtempSync(join(tmpdir(), 'graph-target-check-'));
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=1200,800', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { proc.kill(); } catch { /* gone */ } server.close(); try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still hold a file */ } };
process.once('exit', cleanup);
let target;
for (let i = 0; i < 80 && !target; i++) {
  await wait(250);
  try { target = await new Promise((res, rej) => http.get({ host: '127.0.0.1', port: cdpPort, path: '/json/list' }, (r) => { let b = ''; r.on('data', (d) => (b += d)); r.on('end', () => { try { res(JSON.parse(b).find((t) => t.type === 'page')); } catch (e) { rej(e); } }); }).on('error', rej)); } catch { /* not up yet */ }
}
if (!target) { console.log('graph-target-check: Chrome did not open a page'); process.exit(2); }
const client = await connect(target);
const problems = [];
client.on((m) => {
  if (m.method === 'Runtime.exceptionThrown') problems.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split('\n').slice(0, 3).join(' | '));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') problems.push('console.error: ' + m.params.args.map((a) => a.description || a.value).join(' ').slice(0, 300));
});
await client.send('Runtime.enable');
await client.send('Page.enable');
const started = Date.now();
await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/` });

let state;
const budgetMs = Number(process.env.GT_BUDGET_MS || 180000);
for (;;) {
  await wait(400);
  const raw = await evaluate(client, 'JSON.stringify({ done: window.__gt && window.__gt.done, n: window.__gt ? window.__gt.results.length : -1, error: window.__gt && window.__gt.error, title: document.title })').catch(() => null);
  state = raw ? JSON.parse(raw) : null;
  if (state && (state.done || state.error)) break;
  if (Date.now() - started > budgetMs) { console.log(`graph-target-check: timed out after ${budgetMs} ms at ${state ? state.n : '?'} scenarios (title ${state ? state.title : '?'})`); break; }
}
const report = JSON.parse((await evaluate(client, 'JSON.stringify(window.__gt || { done: false, results: [], error: "the page never set window.__gt — the bundle did not load (see page: lines)", types: 0 })').catch(() => null)) || '{"done":false,"results":[],"error":"the page did not answer","types":0}');
const elapsed = Date.now() - started;
cleanup();

const counts = {};
for (const r of report.results) counts[r.status] = (counts[r.status] || 0) + 1;
const bad = report.results.filter((r) => r.status !== 'passed' && r.status !== 'diverged');
console.log(`graph-target-check${mutant ? ` (mutant ${mutant})` : ''}: ${report.results.length} scenarios in ${elapsed} ms, ${report.types} node types registered, bundle ${(statSync(bundle).size / 1024).toFixed(0)} KB — ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}`);
if (report.error) console.log(`page error: ${report.error}`);
if (typesOut) writeFileSync(typesOut, JSON.stringify(report.typeNames, null, 1) + '\n');
if (mutant) {
  // the control: print the clauses the mutant failed, not every difference
  const failedClauses = [...new Set(bad.flatMap((r) => r.clauses))].sort();
  console.log(`control: ${bad.length} of ${report.results.length} scenarios red on the mutant${failedClauses.length ? ` — clauses ${failedClauses.join(' ')}` : ''}; ${bad.length > 0 ? 'the gate reads red (good)' : 'the gate did NOT read red — it grades nothing'}`);
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ elapsed, counts, problems, mutant, ...report }, null, 1));
  process.exit(bad.length > 0 && !report.error ? 0 : 1);
}
for (const r of bad) {
  console.log(`\n✗ [${r.clauses.join(' ')}] ${r.name}  (${r.file}) — ${r.status}`);
  if (r.reason) console.log('  ' + r.reason.split('\n').slice(0, 6).join('\n  '));
  if (r.difference) console.log('  ' + r.difference.split('\n').slice(0, 12).join('\n  '));
  if (r.claimFailures) for (const c of r.claimFailures) console.log('  claim: ' + c);
}
for (const p of problems.slice(0, 20)) console.log('page: ' + p);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ elapsed, counts, problems, ...report }, null, 1));
process.exit(bad.length === 0 && !report.error && report.results.length > 0 ? 0 : 1);
