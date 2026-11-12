import * as path from 'path';
import * as fs from 'fs';
import { loadCatalog } from '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/src/catalog';
import { parseProject } from '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/src/parse/parseProject';
import { emitHtmlApp } from '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-export/src/emit/html/emitHtml';
const catalog = loadCatalog();
const T = '/Users/richardosborne/vscode_projects/OpenNoodl/templates';
const dirs = fs.readdirSync(T).filter((d) => fs.statSync(path.join(T, d)).isDirectory()).map((d) => path.join(T, d));
dirs.push('/Users/richardosborne/vscode_projects/hiveclip/ui');
const norm = (s: string) => s.replace(/"[^"]*"/g, '"…"').replace(/\d+/g, 'N').slice(0, 110);
const allLoss = new Map<string, number>(); const allRef = new Map<string, number>();
const rows: any[] = [];
for (const dir of dirs) {
  try {
    const ir = parseProject(dir, catalog);
    const nodes = ir.components.reduce((n: number, c: any) => n + (c.nodes?.length ?? 0), 0);
    const out = emitHtmlApp(ir, catalog);
    const p = out.preflight as any;
    const lossNodes = new Set(p.htmlLosses.map((l: any) => l.component + '|' + l.nodeId));
    const refNodes = new Set(p.planRefusals.map((l: any) => l.component + '|' + l.nodeId));
    const comps = new Set([...p.htmlLosses, ...p.planRefusals].map((l: any) => l.component));
    for (const l of p.htmlLosses) allLoss.set(norm(l.what), (allLoss.get(norm(l.what)) ?? 0) + 1);
    for (const r of p.planRefusals) allRef.set(norm(r.reason), (allRef.get(norm(r.reason)) ?? 0) + 1);
    rows.push({ app: path.basename(dir === T ? dir : dir.replace(/\/ui$/, '-ui')), nodes, components: ir.components.length, compsTouched: comps.size, htmlLosses: p.htmlLosses.length, lossNodes: lossNodes.size, planRefusals: p.planRefusals.length, refNodes: refNodes.size, files: Object.keys(out.files).length });
  } catch (e: any) { rows.push({ app: path.basename(dir), error: String(e.message).slice(0, 200) }); }
}
console.table(rows);
const top = (m: Map<string, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
console.log('\nTOP HTML LOSSES'); for (const [k, v] of top(allLoss, 30)) console.log(String(v).padStart(5), k);
console.log('\nTOP PLAN REFUSALS'); for (const [k, v] of top(allRef, 25)) console.log(String(v).padStart(5), k);
