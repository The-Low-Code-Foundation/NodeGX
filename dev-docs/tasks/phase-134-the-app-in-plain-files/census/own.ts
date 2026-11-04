import * as path from 'path'; import * as fs from 'fs';
import { loadCatalog } from '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/src/catalog';
import { parseProject } from '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/src/parse/parseProject';
import { emitHtmlApp } from '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/src/emit/html/emitHtml';
const c = loadCatalog(); const T = '/Users/richardosborne/vscode_projects/OpenNoodl/templates';
const dirs = fs.readdirSync(T).filter((d) => fs.statSync(path.join(T, d)).isDirectory()).map((d) => path.join(T, d)); dirs.push('/Users/richardosborne/vscode_projects/hiveclip/ui');
const SHARED = [/is not carried \(no style/, /is bound, which the HTML target does not print yet/, /For Each not drawn: its items are fed by nothing the plan knows/, /app shell's own Group/, /its on(?:Play|Pause) is not carried/, /as in the React export/]; // s12: React drops a video's play/pause too ("has no DOM event equivalent"); s13: a Drag's own drops are the plan's, React's markers too
const rows: any[] = []; const kinds = new Map<string, number>();
for (const d of dirs) { const h = emitHtmlApp(parseProject(d, c), c).preflight as any;
  const own = h.htmlLosses.filter((l: any) => !SHARED.some((r) => r.test(l.what)));
  for (const l of own) { const k = l.what.replace(/"[^"]*"/g, '"…"').replace(/\d+/g, 'N').slice(0, 110); kinds.set(k, (kinds.get(k) ?? 0) + 1); }
  rows.push({ app: path.basename(d), htmlOwn: own.length, shared: h.htmlLosses.length - own.length, plan: h.planRefusals.length }); }
console.table(rows); console.log('total own', rows.reduce((n, r) => n + r.htmlOwn, 0));
for (const [k, v] of [...kinds.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(String(v).padStart(4), k);
