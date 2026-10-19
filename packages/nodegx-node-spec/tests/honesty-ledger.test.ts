/**
 * P111 SEE-001 AC4 — the honesty ratchet (`scripts/see/honesty-ledger.js --check`), on the real files and on a COPY of
 * the todo template. Each plant moves one thing from a copy whose own ledger holds (the control beside it).
 *
 *   a Function planted in a component  → the number FALLS → red, named
 *   a Function removed                 → the number RISES → red until the ledger is rewritten, then green
 *   a template with no entry, an entry with no template → red
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { HonestyNode } from '../src/honesty';

const ROOT = path.join(__dirname, '..', '..', '..');
const SCRIPT = path.join(ROOT, 'scripts', 'see', 'honesty-ledger.js');

interface NodesFile {
  nodes: HonestyNode[];
}
interface LedgerFile {
  templates: Record<string, { percent: number | null }>;
}
const read = <T>(p: string): T => JSON.parse(fs.readFileSync(p, 'utf8')) as T;

function ledger(flags: string[]): { status: number | null; out: string; err: string } {
  const r = spawnSync(process.execPath, [SCRIPT, ...flags], { encoding: 'utf8', timeout: 60_000 });
  return { status: r.status, out: r.stdout, err: r.stderr };
}

let dir: string;
const templates = () => path.join(dir, 'templates');
const ledgerFile = () => path.join(dir, 'honesty-ledger.json');
const copy = () => ['--templates', templates(), '--ledger', ledgerFile()];
const appNodes = () => path.join(templates(), 'todo-list', 'components', 'App', 'nodes.json');

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'honesty-ledger-'));
  fs.mkdirSync(templates());
  fs.cpSync(path.join(ROOT, 'templates', 'todo-list'), path.join(templates(), 'todo-list'), { recursive: true });
  expect(ledger(['--write', ...copy()]).status).toBe(0);
  expect(ledger(['--check', ...copy()]).status).toBe(0); // the control: the copy's own ledger holds
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

it('control: the committed honesty-ledger.json holds against the templates in this tree', () => {
  const r = ledger(['--check']);
  expect({ status: r.status, err: r.err }).toEqual({ status: 0, err: '' });
});

it('a Function planted in the todo template makes the number fall, and the ratchet names it', () => {
  const nodes = read<NodesFile>(appNodes());
  nodes.nodes.push({ id: 'planted_fn', type: 'JavaScriptFunction', label: 'Planted', parameters: { functionScript: 'x' } });
  fs.writeFileSync(appNodes(), JSON.stringify(nodes));
  const r = ledger(['--check', ...copy()]);
  expect(r.status).toBe(1);
  expect(r.err).toContain('todo-list: the honesty number FELL to 87.8% (690 known, 96 script); the ledger holds 87.9% (690 known, 95 script)');
});

it('a rise fails until the ledger is raised in the same commit', () => {
  const file = path.join(templates(), 'todo-list', 'components', 'Logic', 'Projects', 'nodes.json');
  const nodes = read<NodesFile>(file);
  const before = nodes.nodes.length;
  nodes.nodes = nodes.nodes.filter((n) => n.type !== 'JavaScriptFunction');
  expect(nodes.nodes.length).toBeLessThan(before);
  fs.writeFileSync(file, JSON.stringify(nodes));
  const red = ledger(['--check', ...copy()]);
  expect(red.status).toBe(1);
  expect(red.err).toMatch(/todo-list: the honesty number ROSE to [\d.]+%; the ledger still says 87\.9%/);
  expect(ledger(['--write', ...copy()]).status).toBe(0);
  expect(ledger(['--check', ...copy()]).status).toBe(0);
  expect(read<LedgerFile>(ledgerFile()).templates['todo-list'].percent).toBeGreaterThan(87.9);
});

it('a template with no entry, and an entry with no template, each fail', () => {
  fs.writeFileSync(ledgerFile(), JSON.stringify({ templates: { ghost: { percent: 50 } } }));
  const r = ledger(['--check', ...copy()]);
  expect(r.status).toBe(1);
  expect(r.err).toContain('todo-list: no entry in');
  expect(r.err).toContain('has an entry for "ghost", which is not a template');
});
