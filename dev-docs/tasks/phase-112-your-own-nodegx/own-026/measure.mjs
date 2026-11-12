// OWN-026: test 2's per-change numbers (PLAN.md §4), measured from the files, never estimated (§5).
//
//   node measure.mjs <arm> [--rounds <dir>] [--grades <dir>]      → a markdown table; JSON in <grades>/measure-t2-<arm>.json
//
// Per change n: dollars, minutes, sittings and how the round ended (round.json); the change's own checks (grade.json);
// regressions, a check that passed after n−1 (for n = 1, the seed's t1 grade) and doesn't after n; files and lines
// touched (round n's folder against its seed's, without packages, build output, renders, logs or database files);
// for NodeGX, nodes added / changed / removed (by id) and the script share: JavaScriptFunction nodes and the lines of
// their functionScript (FIX-02's count), and Expression nodes.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const LAB = '/Users/Shared/nodegx-lab';
const [arm, ...rest] = process.argv.slice(2);
const opt = (name, dflt) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : dflt; };
const ROUNDS = opt('--rounds', path.join(LAB, 'own026'));
const GRADES = opt('--grades', path.join(LAB, 'own026-grades'));
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
// `compare` (Richard, 2026-10-23: the goal is the THINNEST layer: as good as plain code, at little extra cost to the
// model): per change, each arm's checks, and NodeGX's overhead over plain code in $, minutes, turns, the tokens it
// read fresh and the tokens it wrote.
if (arm === 'compare') {
  const one = (a, n) => {
    const id = `t2-${a}-c${String(n).padStart(2, '0')}`;
    const r = readJson(path.join(ROUNDS, id, 'round.json'));
    if (!r) return null;
    const g = readJson(path.join(GRADES, id, 'grade.json'));
    const s = readJson(path.join(ROUNDS, id, 'sittings.json')) ?? [];
    const ids = g ? Object.keys(g).filter((k) => /^[SFTC]\d/.test(k)) : [];
    return { usd: r.usdAtClinePassPrices, min: r.seconds / 60, turns: s.reduce((t, x) => t + (x.iterations || 0), 0), fresh: r.tokens.input, out: r.tokens.output,
      checks: g ? `${ids.filter((k) => g[k]?.grade?.startsWith('PASS')).length}/${ids.length}` : '—' };
  };
  const x = (a, b) => (a && b ? `${(a / b).toFixed(1)}×` : '—');
  console.log('| change | checks code / harness / nodegx | nodegx ÷ code: $ | min | turns | fresh in | out | nodegx ÷ harness: $ |\n|---|---|---|---|---|---|---|---|');
  for (let n = 1; n <= 10; n++) {
    const [c, h, g] = ['code', 'harness', 'nodegx'].map((a) => one(a, n));
    if (!c && !h && !g) break;
    console.log(`| c${String(n).padStart(2, '0')} | ${[c, h, g].map((v) => v?.checks ?? '—').join(' / ')} | ${x(g?.usd, c?.usd)} | ${x(g?.min, c?.min)} | ${x(g?.turns, c?.turns)} | ${x(g?.fresh, c?.fresh)} | ${x(g?.out, c?.out)} | ${x(g?.usd, h?.usd)} |`);
  }
  process.exit(0);
}
if (!['code', 'harness', 'nodegx'].includes(arm)) throw new Error('usage: node measure.mjs <arm> | compare');

const SKIP_DIR = new Set(['node_modules', '.next', 'test-results', 'playwright-report', '.previews', 'dist', 'build', '.git', '.cache', '.turbo', 'coverage']);
const SKIP_FILE = /\.(db|sqlite3?|db-wal|db-shm|sqlite-wal|sqlite-shm|log|tsbuildinfo|png|jpe?g|webm|mp4)$/i;
function files(dir, out = new Map(), rel = '') {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = path.join(rel, e.name);
    if (e.isDirectory()) { if (!SKIP_DIR.has(e.name)) files(path.join(dir, e.name), out, r); }
    else if (e.isFile() && !SKIP_FILE.test(e.name)) out.set(r, path.join(dir, e.name));
  }
  return out;
}
const lines = (f) => fs.readFileSync(f, 'utf8').split('\n');
function touched(before, after) {
  const a = files(before), b = files(after);
  let changed = 0, added = 0, removed = 0, plus = 0, minus = 0;
  for (const [r, f] of b) {
    if (!a.has(r)) { added++; plus += lines(f).length; continue; }
    if (fs.readFileSync(f).equals(fs.readFileSync(a.get(r)))) continue;
    changed++;
    const d = spawnSync('diff', [a.get(r), f], { encoding: 'utf8', maxBuffer: 64 << 20 }).stdout || '';
    for (const l of d.split('\n')) { if (l.startsWith('> ')) plus++; else if (l.startsWith('< ')) minus++; }
  }
  for (const [r, f] of a) if (!b.has(r)) { removed++; minus += lines(f).length; }
  return { files: changed + added + removed, changed, added, removed, plus, minus };
}
// NodeGX: every node in every components/**/nodes.json, by component and id
function graph(dir) {
  const nodes = new Map();
  for (const [r, f] of files(dir)) {
    if (!/(^|\/)components\/.*nodes\.json$/.test(r)) continue;
    const walk = (o) => {
      if (Array.isArray(o)) return o.forEach(walk);
      if (!o || typeof o !== 'object') return;
      if (typeof o.id === 'string' && typeof o.type === 'string') nodes.set(`${path.dirname(r)}#${o.id}`, o);
      Object.values(o).forEach(walk);
    };
    walk(readJson(f));
  }
  const fns = [...nodes.values()].filter((n) => n.type === 'JavaScriptFunction');
  return { nodes, functions: fns.length, functionLines: fns.reduce((s, n) => s + String(n.parameters?.functionScript ?? '').split('\n').filter((l) => l.trim()).length, 0),
    expressions: [...nodes.values()].filter((n) => n.type === 'Expression').length };
}
const shallow = (n) => JSON.stringify({ ...n, children: undefined, x: undefined, y: undefined });

const rows = [];
for (let n = 1; n <= 10; n++) {
  const id = `t2-${arm}-c${String(n).padStart(2, '0')}`;
  const r = readJson(path.join(ROUNDS, id, 'round.json'));
  if (!r) break;
  const seed = r.seed;
  const g = readJson(path.join(GRADES, id, 'grade.json'));
  const prevG = readJson(path.join(GRADES, path.basename(seed), 'grade.json'));
  const pass = (x) => typeof x?.grade === 'string' && x.grade.startsWith('PASS');
  const own = g ? Object.keys(g).filter((k) => k.startsWith(`C${n}.`)) : [];
  const regressions = g && prevG ? Object.keys(g).filter((k) => /^[SFTC]\d/.test(k) && pass(prevG[k]) && !pass(g[k])) : null;
  const row = { id, usd: r.usdAtClinePassPrices, minutes: Math.round(r.seconds / 60), sittings: r.sittings, finish: r.finish, judge: r.judge,
    graded: !!g, pass: g ? Object.keys(g).filter((k) => /^[SFTC]\d/.test(k) && pass(g[k])).length : null, of: g ? Object.keys(g).filter((k) => /^[SFTC]\d/.test(k)).length : null,
    own: own.map((k) => `${k} ${pass(g[k]) ? 'PASS' : String(g[k]?.grade ?? '?').split(/[\s:—-]/)[0]}`), regressions,
    touched: touched(path.join(seed, 'work', 'apps'), path.join(ROUNDS, id, 'work', 'apps')) };
  if (arm === 'nodegx') {
    const a = graph(path.join(seed, 'work', 'apps')), b = graph(path.join(ROUNDS, id, 'work', 'apps'));
    row.nodes = { added: [...b.nodes.keys()].filter((k) => !a.nodes.has(k)).length, removed: [...a.nodes.keys()].filter((k) => !b.nodes.has(k)).length,
      changed: [...b.nodes.keys()].filter((k) => a.nodes.has(k) && shallow(a.nodes.get(k)) !== shallow(b.nodes.get(k))).length, total: b.nodes.size };
    // what it read to learn: the kit's teaching tools against its own project's docs (LEARNINGS #7)
    const KIT = ['get_node_type', 'get_example', 'list_examples', 'find_tools', 'get_project_info', 'list_node_types', 'get_style_vocabulary'];
    let lookups = 0, lookupChars = 0, docs = 0;
    for (const k of fs.existsSync(path.join(ROUNDS, id, 'sittings')) ? fs.readdirSync(path.join(ROUNDS, id, 'sittings')) : []) {
      const ls = fs.readFileSync(path.join(ROUNDS, id, 'sittings', k, 'agent.jsonl'), 'utf8').split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((l) => l?.type === 'agent_event');
      const out = new Map(ls.filter((l) => l.event?.type === 'content_end' && l.event.toolCallId).map((l) => [l.event.toolCallId, l.event.output]));
      for (const l of ls.filter((x) => x.event?.type === 'content_start' && x.event.contentType === 'tool')) {
        const name = l.event.toolName === 'nodegx__call_tool' ? l.event.input?.name : String(l.event.toolName).replace(/^nodegx__/, '');
        const input = JSON.stringify(l.event.input ?? '');
        if (KIT.includes(name)) { lookups++; lookupChars += JSON.stringify(out.get(l.event.toolCallId) ?? '').length; }
        if ((name === 'read_files' || (name === 'run_commands' && /\b(cat|sed|head|grep|less)\b/.test(input))) && /docs\//.test(input)) docs++;
      }
    }
    row.learning = { lookups, lookupKChars: Math.round(lookupChars / 1000), ownDocsReads: docs };
    row.script = { functions: `${a.functions} → ${b.functions}`, functionLines: `${a.functionLines} → ${b.functionLines}`, expressions: `${a.expressions} → ${b.expressions}` };
  }
  rows.push(row);
}
fs.writeFileSync(path.join(GRADES, `measure-t2-${arm}.json`), JSON.stringify(rows, null, 2) + '\n');
const head = ['change', '$', 'min', 'sittings', 'end', 'checks', 'own', 'regressions', 'files (+/−lines)', ...(arm === 'nodegx' ? ['nodes +/~/−', 'JS fns (lines)', 'Expr', 'kit lookups (k chars)', 'own docs reads'] : [])];
console.log(`| ${head.join(' | ')} |\n|${head.map(() => '---').join('|')}|`);
for (const r of rows) console.log(`| ${[r.id, r.usd, r.minutes, r.sittings, `${r.finish}/${r.judge}`, r.graded ? `${r.pass}/${r.of}` : '—', r.own.join(', ') || '—',
  r.regressions ? (r.regressions.join(' ') || 'none') : '—', `${r.touched.files} (+${r.touched.plus}/−${r.touched.minus})`,
  ...(arm === 'nodegx' ? [`${r.nodes.added}/${r.nodes.changed}/${r.nodes.removed}`, `${r.script.functions} (${r.script.functionLines})`, r.script.expressions, `${r.learning.lookups} (${r.learning.lookupKChars}k)`, r.learning.ownDocsReads] : [])].join(' | ')} |`);
