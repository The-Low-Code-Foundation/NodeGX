/**
 * P111 SEE-000 — the census gate (`scripts/see/census.js --check`), graded on the real files and on a COPY of the todo template.
 *
 * AC4  a Function added to the todo template by hand fails the gate, named; regenerating the census makes it pass again.
 * The control (the real templates against the committed census.json) runs beside the plant, so a red is the plant.
 * AC1  the counting rule is the runtime's (`nodes.json` entries); the scoping count also counted each component's record in
 *      component.json, and the census prints the difference — asserted here as handObjects − nodes = components.
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { HonestyNode } from '../src/honesty';

const ROOT = path.join(__dirname, '..', '..', '..');
const SCRIPT = path.join(ROOT, 'scripts', 'see', 'census.js');
const CENSUS = path.join(ROOT, 'dev-docs', 'tasks', 'phase-111-you-can-see-what-it-built', 'census.json');

/** The census rows this spec reads. */
interface CensusFile {
  projects: Array<{ name: string; nodes: number; handObjects: number; components: number; componentRecords: number }>;
}
interface NodesFile {
  nodes: HonestyNode[];
}
const read = <T>(p: string): T => JSON.parse(fs.readFileSync(p, 'utf8')) as T;

function census(flags: string[]): { status: number | null; out: string; err: string } {
  const r = spawnSync(process.execPath, [SCRIPT, ...flags], { encoding: 'utf8', timeout: 60_000 });
  return { status: r.status, out: r.stdout, err: r.stderr };
}

let dir: string;
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'see-census-'));
  fs.mkdirSync(path.join(dir, 'templates'));
  fs.cpSync(path.join(ROOT, 'templates', 'todo-list'), path.join(dir, 'templates', 'todo-list'), { recursive: true });
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const copyFlags = () => ['--templates', path.join(dir, 'templates'), '--census', path.join(dir, 'census.json'), '--md', path.join(dir, 'CENSUS.md')];

describe('SEE-000 — the census gate', () => {
  it('control: the committed census.json holds against the templates in this tree', () => {
    const r = census(['--check']);
    expect({ status: r.status, err: r.err }).toEqual({ status: 0, err: '' });
  });

  it('AC1: a node is what the runtime instantiates, and the scoping over-count is exactly one component record per component', () => {
    for (const p of read<CensusFile>(CENSUS).projects) {
      expect({ name: p.name, over: p.handObjects - p.nodes }).toEqual({ name: p.name, over: p.components });
      expect(p.componentRecords).toBe(p.components);
    }
  });

  it('AC4: a Function planted in the todo template by hand reddens the gate, named; the regenerated census holds again', () => {
    expect(census(copyFlags()).status).toBe(0); // the copy's own census, written
    expect(census(['--check', ...copyFlags()]).status).toBe(0); // and it holds

    const file = path.join(dir, 'templates', 'todo-list', 'components', 'App', 'nodes.json');
    const nodes = read<NodesFile>(file);
    nodes.nodes.push({ id: 'planted_fn', type: 'JavaScriptFunction', label: 'Planted', parameters: { functionScript: 'Script.Outputs.x = 1;\n' } });
    fs.writeFileSync(file, JSON.stringify(nodes, null, 2));

    const red = census(['--check', ...copyFlags()]);
    expect(red.status).toBe(1);
    expect(red.err).toContain('todo-list: functions is 96, census.json says 95');
    expect(red.err).toContain('todo-list: nodes is 889, census.json says 888');
    expect(red.err).toContain('todo-list: script is 96, census.json says 95');

    expect(census(copyFlags()).status).toBe(0); // regenerate
    expect(census(['--check', ...copyFlags()]).status).toBe(0);
  });
});
