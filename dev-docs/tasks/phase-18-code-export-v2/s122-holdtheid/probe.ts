// Usage (from packages/nodegx-export): probe.ts <exportSrc> [<exportSrc>…] — fixtures/held-desk and its variants, the
// runtime arm and one export arm per source, the readings side by side (the three values of each step).
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
const PKG = process.cwd();
const FIXTURE = path.join(PKG, 'tests', 'fixtures', 'held-desk');
const HOME = path.join(FIXTURE, 'components', 'Pages', 'Home');
const base = { nodes: JSON.parse(fs.readFileSync(path.join(HOME, 'nodes.json'), 'utf-8')).nodes, connections: JSON.parse(fs.readFileSync(path.join(HOME, 'connections.json'), 'utf-8')).connections };
const STEPS = ['Remove', 'Pick b', 'Remove', 'Pick nothing', 'Remove'];
const node = (g: any, id: string) => g.nodes.find((n: any) => n.id === id);
const VARIANTS: Array<[string, (g: any) => void]> = [
  ['fixture', () => {}],
  ['hold unticked', (g) => (node(g, 'hold').parameters['runOnChange-in-id'] = false)],
  ['no Did Mount', (g) => (g.connections = g.connections.filter((c: any) => c.fromProperty !== 'didMount'))],
  ['no seed', (g) => delete node(g, 'idRead').parameters.value],
  ['no ready', (g) => (g.connections = g.connections.filter((c: any) => !(c.fromId === 'hold' && c.toId === 'loadedSet')))],
  ['second ticked', (g) => (node(g, 'confirmed').parameters['runOnChange-in-id'] = true)],
  // The same click: Remove also fires a Set Variable that reads the second Function's output, wired after its Run, then
  // before it. The echo replaces "removed" in the readings (the third value).
  ['same click, after', (g) => sameClick(g, 'after')],
  ['same click, before', (g) => sameClick(g, 'before')]
];
function sameClick(g: any, order: 'after' | 'before') {
  g.nodes.push({ id: 'echoSet', type: 'Set Variable', label: 'Echo', parameters: { name: 'echo' } });
  g.nodes.push({ id: 'echoRead', type: 'Variable2', label: 'Echo', parameters: { name: 'echo' } });
  g.connections = g.connections.filter((c: any) => c.fromId !== 'removedRead');
  g.connections.push({ fromId: 'echoRead', fromProperty: 'value', toId: 'removedText', toProperty: 'text' });
  g.connections.push({ fromId: 'confirmed', fromProperty: 'out-saying', toId: 'echoSet', toProperty: 'value' });
  const fire = { fromId: 'removeBtn', fromProperty: 'onClick', toId: 'echoSet', toProperty: 'do' };
  const at = g.connections.findIndex((c: any) => c.fromId === 'removeBtn' && c.toId === 'confirmed');
  g.connections.splice(order === 'after' ? at + 1 : at, 0, fire);
}
const withGraph = (g: any) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'held-desk-'));
  fs.cpSync(FIXTURE, dir, { recursive: true });
  const h = path.join(dir, 'components', 'Pages', 'Home');
  for (const [f, k] of [['nodes.json', 'nodes'], ['connections.json', 'connections']]) {
    const doc = JSON.parse(fs.readFileSync(path.join(h, f), 'utf-8'));
    fs.writeFileSync(path.join(h, f), JSON.stringify({ ...doc, [k]: g[k] }, null, 2));
  }
  return dir;
};
const arm = (helper: string, input: unknown) => JSON.parse(execFileSync(process.execPath, [path.join(PKG, 'tests', 'helpers', helper)], { input: JSON.stringify(input), encoding: 'utf-8', maxBuffer: 1 << 26 }));
const values = (r: string[]) => [r[2], r[4], r[6]].map((v) => v ?? '∅').join(' | ');
for (const [name, edit] of VARIANTS) {
  const g = structuredClone(base);
  edit(g);
  const dir = withGraph(g);
  const rt = arm('runtime-ticked-arm.js', [{ nodes: g.nodes, connections: g.connections, scenarios: [STEPS] }])[0][0];
  const exps = process.argv.slice(2).map((E) => {
    const { loadCatalog } = require(`${E}/catalog`);
    const { emitApp } = require(`${E}/emit/emitApp`);
    const { parseProject } = require(`${E}/parse/parseProject`);
    const cat = loadCatalog();
    const app = emitApp(parseProject(dir, cat), cat);
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'held-app-'));
    for (const [f, t] of Object.entries(app.files) as Array<[string, string]>) { fs.mkdirSync(path.dirname(path.join(out, f)), { recursive: true }); fs.writeFileSync(path.join(out, f), t); }
    try { return arm('export-react-arm.js', [{ dir: out, scenarios: [STEPS] }])[0][0]; } catch (e: any) { return [['ERR ' + String(e.stderr ?? e.message).slice(0, 200)]]; }
  });
  console.log(`\n== ${name}`);
  ['load', ...STEPS].forEach((s, i) => console.log(s.padEnd(13), 'rt:', values(rt[i]).padEnd(28), exps.map((x: any, k: number) => `ex${k}: ${x[i] ? values(x[i]) : x[0]}`).join('   ')));
}
