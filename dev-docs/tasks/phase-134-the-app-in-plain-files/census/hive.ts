import { loadCatalog } from '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/src/catalog';
import { parseProject } from '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/src/parse/parseProject';
import { emitHtmlApp } from '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/src/emit/html/emitHtml';
const c = loadCatalog(); const ir = parseProject('/Users/richardosborne/vscode_projects/hiveclip/ui', c); const h = emitHtmlApp(ir, c).preflight as any;
const norm = (s: string) => s.replace(/"[^"]*"/g, '"…"').replace(/\d+/g, 'N').slice(0, 120);
const g = (xs: any[], k: string) => { const m = new Map<string, Set<string>>(); for (const x of xs) { const key = norm(x[k]); if (!m.has(key)) m.set(key, new Set()); m.get(key)!.add(x.component); } return [...m.entries()].map(([key, s]) => [xs.filter((x) => norm(x[k]) === key).length, key, [...s].slice(0, 4).join(', ')]).sort((a: any, b: any) => b[0] - a[0]); };
console.log('HTML LOSSES'); for (const r of g(h.htmlLosses, 'what')) console.log(String(r[0]).padStart(4), r[1], ' ::', r[2]);
console.log('\nPLAN REFUSALS'); for (const r of g(h.planRefusals, 'reason')) console.log(String(r[0]).padStart(4), r[1], ' ::', r[2]);
