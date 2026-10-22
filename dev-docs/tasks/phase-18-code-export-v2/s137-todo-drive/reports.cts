// Usage (from packages/nodegx-export): reports.cts <exportSrc> <pattern>... — every template's EXPORT-REPORT.md lines matching each pattern, counted per template.
import * as fs from 'fs';
import * as path from 'path';
const [E, ...patterns] = process.argv.slice(2);
const { loadCatalog } = require(`${E}/catalog`);
const { emitApp } = require(`${E}/emit/emitApp`);
const { parseProject } = require(`${E}/parse/parseProject`);
const catalog = loadCatalog();
const T = '/Users/richardosborne/vscode_projects/OpenNoodl/templates';
for (const p of patterns) {
  const per: Record<string, number> = {};
  const lines: string[] = [];
  for (const t of fs.readdirSync(T).sort()) {
    if (!fs.existsSync(path.join(T, t, 'nodegx.project.json'))) continue;
    const report: string = emitApp(parseProject(path.join(T, t), catalog), catalog).files['EXPORT-REPORT.md'];
    const hit = report.split('\n').filter((l) => l.includes(p));
    if (hit.length) { per[t] = hit.length; lines.push(...hit.map((l) => `${t}: ${l.slice(0, 200)}`)); }
  }
  console.log(`== "${p}": ${Object.values(per).reduce((a, b) => a + b, 0)}`, JSON.stringify(per));
  for (const l of lines.slice(0, 40)) console.log('  ', l);
}
