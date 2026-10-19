// Usage (from packages/nodegx-export): arms.ts <exportSrc> [runtime] — the Root Desk (`tests/helpers/root-desk.ts`) and
// its variants emitted with <exportSrc> and rendered by `tests/helpers/export-react-arm.js`; with `runtime`, the runtime arm
// (`tests/helpers/runtime-mounted-arm.js`) as well. Prints each variant's readings, one line per step: Open, Close, Reset,
// Open, Close.
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Desk, writeDesk } from '../../../../packages/nodegx-export/tests/helpers/root-desk';

const [E, withRuntime] = process.argv.slice(2);
const HELPERS = path.join(__dirname, '../../../../packages/nodegx-export/tests/helpers');
const { loadCatalog } = require(`${E}/catalog`);
const { emitApp } = require(`${E}/emit/emitApp`);
const { parseProject } = require(`${E}/parse/parseProject`);
const catalog = loadCatalog();

const variants: Array<[string, ((d: Desk) => void) | undefined]> = [
  ['the desk', undefined],
  [
    "the Sheet's root authored Mounted true",
    (d) => {
      d.components['Components/Sheet'].nodes.find((n) => n.id === 'shRoot')!.parameters = {};
    }
  ],
  [
    'the Mounted wire on an element inside the root',
    (d) => {
      const sheet = d.components['Components/Sheet'];
      const root = sheet.nodes.find((n) => n.id === 'shRoot')!;
      const inside = root.children!;
      root.children = ['shBody'];
      root.parameters = {};
      sheet.nodes.push({ id: 'shBody', type: 'Group', label: 'Sheet body', parent: 'shRoot', children: inside, parameters: { mounted: false } });
      for (const id of inside) sheet.nodes.find((n) => n.id === id)!.parent = 'shBody';
      sheet.connections.find((c) => c.toId === 'shRoot' && c.toProperty === 'mounted')!.toId = 'shBody';
    }
  ],
  [
    'the control',
    (d) => {
      for (const graph of Object.values(d.components)) graph.connections = graph.connections.filter((c) => c.toProperty !== 'mounted');
    }
  ]
];

const arm = (helper: string, input: unknown): string[][][][] =>
  JSON.parse(execFileSync(process.execPath, [path.join(HELPERS, helper)], { input: JSON.stringify(input), encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 1 << 24 }));
const desks = variants.map(([, edit]) => writeDesk(edit));
const appDirs = desks.map((d) => {
  const app = emitApp(parseProject(d.dir, catalog), catalog);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'root-desk-arms-'));
  for (const [file, text] of Object.entries<string>(app.files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  }
  return dir;
});
// Not Inside: HEAD's Sheet and the control's are never drawn (the spec presses it, on the tree).
const steps = (_dir: string) => ['Open', 'Close', 'Reset', 'Open', 'Close'];
const exported = arm('export-react-arm.js', appDirs.map((dir) => ({ dir, scenarios: [steps(dir)] })));
const runtime = withRuntime === 'runtime' ? arm('runtime-mounted-arm.js', desks.map((d, i) => ({ dir: d.dir, scenarios: [steps(appDirs[i])] }))) : null;
variants.forEach(([name], i) => {
  console.log(`== ${name} (${steps(appDirs[i]).join(', ')})`);
  exported[i][0].forEach((r, step) => {
    const rt = runtime ? runtime[i][0][step] : null;
    console.log(`  export:  ${r.join(' | ')}${rt ? `\n  runtime: ${rt.join(' | ')}${JSON.stringify(rt) === JSON.stringify(r) ? '' : '   <-- differs'}` : ''}`);
  });
});
