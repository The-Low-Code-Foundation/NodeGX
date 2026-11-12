// Usage (from packages/nodegx-export): areas.cts <exportSrc> — per template, the emitted `<textarea` elements, the
// `type="textArea"` inputs left, and the Text Inputs whose Type is Text Area in the project (literal, or wired).
import * as fs from 'fs';
import * as path from 'path';
const [E] = process.argv.slice(2);
const { loadCatalog } = require(`${E}/catalog`);
const { emitApp } = require(`${E}/emit/emitApp`);
const { parseProject } = require(`${E}/parse/parseProject`);
const catalog = loadCatalog();
const T = '/Users/richardosborne/vscode_projects/OpenNoodl/templates';
const sum = { authored: 0, wired: 0, textarea: 0, typed: 0 };
for (const t of fs.readdirSync(T).sort()) {
  if (!fs.existsSync(path.join(T, t, 'nodegx.project.json'))) continue;
  const ir = parseProject(path.join(T, t), catalog);
  let authored = 0, wired = 0;
  for (const c of ir.components) for (const n of c.nodes) {
    const type = n.parameters.find((p: any) => p.name === 'type')?.value;
    if (!/textinput|Text Input/.test(n.type)) continue;
    if (type?.kind === 'literal' && type.value === 'textArea') authored++;
    if (c.connections.some((w: any) => w.toId === n.id && w.toProperty === 'type')) wired++;
  }
  const files = Object.values(emitApp(ir, catalog).files as Record<string, string>).join('\n');
  const textarea = (files.match(/<textarea\b/g) ?? []).length, typed = (files.match(/type="textArea"/g) ?? []).length;
  Object.assign(sum, { authored: sum.authored + authored, wired: sum.wired + wired, textarea: sum.textarea + textarea, typed: sum.typed + typed });
  if (authored || wired || textarea || typed) console.log(t.padEnd(30), `Text Area ${authored}, Type wired ${wired}; emitted <textarea ${textarea}, type="textArea" ${typed}`);
}
console.log('TOTAL', JSON.stringify(sum));
