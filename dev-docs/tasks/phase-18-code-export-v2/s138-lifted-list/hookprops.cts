// Usage (from packages/nodegx-export): hookprops.cts <srcA> <srcB> — every template emitted under both sources: each hook
// call's props (`use<X>({ … })`), the props B passes that A did not; and B's memoised render runs (`useMemo(() => …)`), with
// the type each one's lifted value is handed as (the hook's `on<X>Changed?: (value: T | undefined)`).
import * as fs from 'fs';
import * as path from 'path';
const [A, B] = process.argv.slice(2);
const T = '/Users/richardosborne/vscode_projects/OpenNoodl/templates';
const emitAll = (E: string) => {
  const { loadCatalog } = require(`${E}/catalog`); const { emitApp } = require(`${E}/emit/emitApp`); const { parseProject } = require(`${E}/parse/parseProject`);
  const c = loadCatalog(); const out: Record<string, Record<string, string>> = {};
  for (const t of fs.readdirSync(T).sort()) if (fs.existsSync(path.join(T, t, 'nodegx.project.json'))) out[t] = emitApp(parseProject(path.join(T, t), c), c).files;
  return out;
};
const calls = (text: string): Map<string, Set<string>> => {
  const m = new Map<string, Set<string>>(); let k = 0;
  const re = /^ {2}(use[A-Z][A-Za-z0-9]*)\((\{[\s\S]*?\})?\);$/gm; let x: RegExpExecArray | null;
  while ((x = re.exec(text))) {
    const props = new Set<string>();
    if (x[2]) for (const line of x[2].replace(/^\{\s*|\s*\}$/g, '').split(/,\s*\n\s*|, (?=[A-Za-z_$][\w$]*(?::|,|$))/)) { const n = /^\s*([A-Za-z_$][\w$]*)/.exec(line); if (n) props.add(n[1]); }
    m.set(`${x[1]}#${k++}`, props);
  }
  return m;
};
const a = emitAll(A), b = emitAll(B);
let gained = 0; const rows: string[] = []; let memo = 0; const memoRows: string[] = [];
for (const t of Object.keys(b)) {
  for (const [file, text] of Object.entries(b[t])) {
    if (!file.endsWith('.tsx')) continue;
    const ca = calls(a[t]?.[file] ?? ''), cb = calls(text);
    for (const [key, props] of cb) {
      const before = ca.get(key) ?? new Set();
      const extra = [...props].filter((p) => !before.has(p));
      if (extra.length) { gained += extra.length; rows.push(`${t} ${file} ${key.split('#')[0]}: + ${extra.join(', ')}`); }
    }
    for (const line of text.split('\n')) {
      const mm = /const (\w+) = useMemo\(\(\) => (\w+)\(/.exec(line);
      if (!mm) continue;
      memo++;
      const lifted = [...text.matchAll(new RegExp(`on(\\w+)Changed\\?\\.\\(${mm[1]}\\??\\.(\\w+)`, 'g'))].map((x) => x[2]);
      const types = lifted.map((o) => { const d = new RegExp(`on${o.charAt(0).toUpperCase()}${o.slice(1)}Changed\\?: \\(value: ([^)]*)\\)`).exec(text); return `${o}: ${d ? d[1] : '?'}`; });
      memoRows.push(`${t} ${file} ${mm[1]} → ${types.join('; ') || '(read by a push effect)'}`);
    }
  }
}
console.log(`hook props B passes that A did not: ${gained}`); for (const r of rows) console.log('  ', r);
console.log(`memoised render runs in B: ${memo}`); for (const r of memoRows) console.log('  ', r);
