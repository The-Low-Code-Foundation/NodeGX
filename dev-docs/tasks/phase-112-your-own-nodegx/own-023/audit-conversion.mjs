// OWN-023 round 2b: the outside check brief-B2.txt promises. Written BEFORE B2's result was read (2026-10-21), so the
// lines it draws are not fitted to the build. It only measures; a person reads the hits.
//   node audit-conversion.mjs <work folder (has reference/ and the NodeGX app)> [--json out.json]
// What it counts:
//   1. the NodeGX graph: components, nodes, node types (visual / logic / code)
//   2. code: every code-shaped parameter of a node, every .js/.mjs file in the app outside gala-rules/ and node_modules/
//   3. the forbidden things: the old screen modules loaded or copied whole, and code that builds or edits page elements
//   4. copying: for each reference/src file, the share of its non-trivial lines that appear verbatim in the app's code
import fs from 'node:fs';
import path from 'node:path';

const work = path.resolve(process.argv[2] || '');
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;
const ref = path.join(work, 'reference');
if (!fs.existsSync(ref)) throw new Error(`no reference/ in ${work}`);

const walk = (dir, keep) => {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) continue; // gala-rules is linked in, never counted
    if (e.isDirectory()) out.push(...walk(p, keep)); else if (keep(p)) out.push(p);
  }
  return out;
};
// the app: the folder (under work/, not reference/ or gala-rules/) holding a nodegx.project.json
const apps = walk(work, (p) => path.basename(p) === 'nodegx.project.json').map(path.dirname).filter((d) => !d.startsWith(ref));
if (apps.length !== 1) throw new Error(`expected one NodeGX app under ${work}, found ${apps.length}: ${apps.join(', ')}`);
const app = apps[0];
const rel = (p) => path.relative(work, p);

// ---- 1. the graph
const VISUAL = /^(Page|Group|Text|Image|Icon|Columns|net\.noodl\.(controls|visual)\.|Circle|Rectangle|Video|PageStack|Router|Navigation|ScrollView|.*Repeater)/;
const CODE_TYPES = /^(JavaScriptFunction|Javascript2|Expression|net\.noodl\.(cloud\.)?(javascript|function)|Script)/i;
const comps = walk(path.join(app, 'components'), (p) => path.basename(p) === 'nodes.json');
const types = {}; let nodes = 0;
const nodeCode = []; // { comp, type, id, param, chars, text }
for (const f of comps) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const ns = Array.isArray(d) ? d : d.nodes || [];
  const comp = path.relative(path.join(app, 'components'), path.dirname(f));
  for (const n of ns) {
    nodes++; types[n.type] = (types[n.type] || 0) + 1;
    for (const [k, v] of Object.entries(n.parameters || {})) {
      if (typeof v !== 'string' || v.length < 40) continue;
      if (CODE_TYPES.test(n.type) || /=>|function\s*\(|;\s*\n|Outputs\.|Inputs\./.test(v)) nodeCode.push({ comp, type: n.type, id: n.id, param: k, chars: v.length, text: v });
    }
  }
}
const kind = (t) => (CODE_TYPES.test(t) ? 'code' : VISUAL.test(t) ? 'visual' : t.startsWith('/') ? 'component' : 'logic');
const byKind = {}; for (const [t, c] of Object.entries(types)) byKind[kind(t)] = (byKind[kind(t)] || 0) + c;

// ---- 2. code files in the app
const files = walk(app, (p) => /\.(m?js|html)$/.test(p) && !p.includes(`${path.sep}gala-rules${path.sep}`) && !/\.min\.js$/.test(p)
  && !/three(\.module|\.core)?\.js$/.test(p) && !p.includes(`${path.sep}tests${path.sep}`) && !/\.test\.m?js$/.test(p));
const fileCode = files.map((p) => ({ file: rel(p), chars: fs.statSync(p).size, text: fs.readFileSync(p, 'utf8') }));

// ---- 3. forbidden
const SCREEN = ['main.js', 'ui.js', 'state.js', 'i18n.js'];
const DOM = /\b(createElement|innerHTML|outerHTML|insertAdjacentHTML|appendChild|replaceChildren|querySelector(All)?|getElementById|getElementsBy\w+|\.textContent\s*=|\.classList\.|\.style\.\w+\s*=)/g;
const hits = [];
const scan = (where, text) => {
  for (const [i, line] of text.split('\n').entries()) {
    const m = line.match(DOM); if (m) hits.push({ where, line: i + 1, what: [...new Set(m)].join(' '), text: line.trim().slice(0, 160) });
  }
};
for (const c of nodeCode) scan(`${c.comp} · ${c.type} ${c.id} · ${c.param}`, c.text);
for (const f of fileCode) scan(f.file, f.text);
const screenFiles = fileCode.filter((f) => SCREEN.includes(path.basename(f.file)));
const loads = [...nodeCode.map((c) => ({ where: `${c.comp} · ${c.id}`, text: c.text })), ...fileCode.map((f) => ({ where: f.file, text: f.text }))]
  .flatMap(({ where, text }) => [...text.matchAll(/(import\s*\(|import\s+[^;]*from\s*|<script[^>]*src=)\s*['"`]([^'"`]+)['"`]/g)].map((m) => ({ where, spec: m[2] })))
  .filter((l) => /reference\/|(^|\/)(main|ui|state|i18n|world|play|people|music|boot)(\.m?js)?$/.test(l.spec));

// ---- 4. copying
const norm = (l) => l.trim().replace(/\s+/g, ' ');
const appLines = new Set([...nodeCode.map((c) => c.text), ...fileCode.map((f) => f.text)].flatMap((t) => t.split('\n').map(norm)).filter((l) => l.length > 20));
const copied = fs.readdirSync(path.join(ref, 'src')).filter((f) => f.endsWith('.js')).map((f) => {
  const ls = fs.readFileSync(path.join(ref, 'src', f), 'utf8').split('\n').map(norm).filter((l) => l.length > 20);
  const same = ls.filter((l) => appLines.has(l)).length;
  return { file: f, lines: ls.length, verbatim: same, share: ls.length ? Math.round((100 * same) / ls.length) : 0 };
});

const sum = (a) => a.reduce((s, x) => s + x.chars, 0);
const report = {
  app: rel(app),
  graph: { components: comps.length, nodes, byKind, types: Object.fromEntries(Object.entries(types).sort((a, b) => b[1] - a[1])) },
  code: {
    inNodes: { count: nodeCode.length, chars: sum(nodeCode), list: nodeCode.map(({ text, ...c }) => c).sort((a, b) => b.chars - a.chars) },
    inFiles: { count: fileCode.length, chars: sum(fileCode), list: fileCode.map(({ text, ...f }) => f).sort((a, b) => b.chars - a.chars) },
  },
  forbidden: { screenModuleFiles: screenFiles.map((f) => f.file), loadsOfOldModules: loads, domCodeHits: hits.length, domCode: hits },
  copiedFromReference: copied,
};
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2) + '\n');

console.log(`app ${report.app}: ${comps.length} components, ${nodes} nodes ${JSON.stringify(byKind)}`);
console.log(`code in nodes: ${nodeCode.length} params, ${sum(nodeCode)} chars · code in files: ${fileCode.length} files, ${sum(fileCode)} chars`);
for (const f of report.code.inFiles.list.slice(0, 12)) console.log(`  file ${f.file} ${f.chars}`);
console.log(`old screen modules present: ${screenFiles.length ? screenFiles.map((f) => f.file).join(', ') : 'none'}`);
console.log(`loads of old modules: ${loads.length ? loads.map((l) => `${l.where} → ${l.spec}`).join('; ') : 'none'}`);
console.log(`page-element code: ${hits.length} lines`);
const where = {}; for (const h of hits) where[h.where] = (where[h.where] || 0) + 1;
for (const [w, n] of Object.entries(where).sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${n} ${w}`);
console.log('copied verbatim from reference/src (lines > 20 chars):');
for (const c of copied) console.log(`  ${c.file.padEnd(10)} ${String(c.verbatim).padStart(4)} / ${String(c.lines).padEnd(4)} ${c.share}%`);
