import * as path from 'path'; import * as fs from 'fs';
import { loadCatalog } from '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/src/catalog';
import { parseProject } from '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/src/parse/parseProject';
import { emitHtmlApp } from '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/src/emit/html/emitHtml';
const c = loadCatalog(); const T = '/Users/richardosborne/vscode_projects/OpenNoodl/templates';
const dirs = fs.readdirSync(T).filter((d) => fs.statSync(path.join(T, d)).isDirectory()).map((d) => path.join(T, d)); dirs.push('/Users/richardosborne/vscode_projects/hiveclip/ui');
const m = new Map<string, Set<string>>(); const n = new Map<string, number>();
const norm = (s: string) => s.replace(/"[^"]*"/g, '"…"').replace(/\/[A-Z][\w /-]*/g, '/X').replace(/\d+/g, 'N').replace(/its [\w-]+ (is not carried|is bound)/, 'its PORT $1').slice(0, 150);
for (const d of dirs) { const h = emitHtmlApp(parseProject(d, c), c).preflight as any;
  for (const l of h.htmlLosses) { const k = norm(l.what); n.set(k, (n.get(k) ?? 0) + 1); if (!m.has(k)) m.set(k, new Set()); m.get(k)!.add(path.basename(d)); } }
for (const [k, v] of [...n.entries()].sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(5), String(m.get(k)!.size).padStart(3), k);
