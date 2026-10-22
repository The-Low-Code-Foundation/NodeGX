// Usage (from packages/nodegx-export): shell.cts <exportSrc> — per template, the router shell's refused nodes (the plan's
// "node beside the router shell") and how many times EXPORT-REPORT.md says that sentence.
import * as fs from 'fs';
import * as path from 'path';
const [E] = process.argv.slice(2);
const { loadCatalog } = require(`${E}/catalog`);
const { emitApp } = require(`${E}/emit/emitApp`);
const { parseProject } = require(`${E}/parse/parseProject`);
const catalog = loadCatalog();
const T = '/Users/richardosborne/vscode_projects/OpenNoodl/templates';
let total = 0, named = 0, css = 0;
for (const t of fs.readdirSync(T).sort()) {
  if (!fs.existsSync(path.join(T, t, 'nodegx.project.json'))) continue;
  const ir = parseProject(path.join(T, t), catalog);
  const app = emitApp(ir, catalog);
  const report: string = app.files['EXPORT-REPORT.md'];
  // The report's own data: the shell's refusals ride on its scaffolded component row.
  const shell = app.report.components.filter((c: any) => c.skipped?.kind === 'scaffolded').flatMap((c: any) => (c.refusals ?? []).filter((r: any) => r.reason === 'node beside the router shell'));
  // Named = the refusal's own sentence in the report (a label like "App" is in every report for other reasons).
  const inReport = { length: report.split('beside the router shell').length - 1 };
  total += shell.length; named += inReport.length; css += shell.filter((r: any) => r.type === 'CSS Definition').length;
  if (shell.length) console.log(t.padEnd(30), String(shell.length).padStart(3), 'refused,', inReport.length, 'named in the report', shell.map((r: any) => `${r.type}${r.label ? ` "${r.label}"` : ''}`).slice(0, 3).join('; '));
}
console.log('TOTAL', total, 'refused beside the router shell,', css, 'CSS Definitions,', named, 'named in a report');
