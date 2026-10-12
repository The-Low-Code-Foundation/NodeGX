/**
 * NSP-009 — the ratchet (`scripts/node-spec/spec-ledger.js`), graded on COPIES of its inputs.
 *
 * The real `--check` runs as its own step in the PR job; this file does not repeat it (a second pipeline's check is a duplicate).
 * Every planted failure here sits beside a control run on the same copies that passes, so a red is the plant and not the files.
 *
 * AC1  a planted fall and a planted unraised rise of the floor each fail `--check`, named.
 * AC2  a fake picker node in a COPY of the catalog fails the new-node gate with the node's name; owed, it does not.
 * AC3  the ledger's per-tier totals and names equal the census's, both directions — a row missing from the census and a row the
 *      catalog does not have each fail.
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..', '..');
const SCRIPT = path.join(ROOT, 'scripts', 'node-spec', 'spec-ledger.js');
const PHASE = path.join(ROOT, 'dev-docs', 'tasks', 'phase-107-the-node-says-what-it-does');
const CATALOG = path.join(ROOT, 'packages', 'noodl-types', 'src', 'node-catalog.json');

type Json = Record<string, any>;
const read = (p: string): Json => JSON.parse(fs.readFileSync(p, 'utf8'));

interface Run {
  status: number | null;
  out: string;
  err: string;
}

let dir: string;
let reading: Json;

/** The ledger on copies: each input written to the tmp dir (changed or not) and passed by flag. */
function ledger(flags: string[], copies: { catalog?: Json; census?: Json; ledger?: Json } = {}): Run {
  const files: Record<string, string> = {};
  for (const [key, value] of Object.entries(copies)) {
    files[key] = path.join(dir, `${key}-${Math.random().toString(36).slice(2)}.json`);
    fs.writeFileSync(files[key], JSON.stringify(value));
  }
  const pass = Object.entries(files).flatMap(([key, file]) => [`--${key}`, file]);
  const r = spawnSync(process.execPath, [SCRIPT, ...flags, ...pass], { encoding: 'utf8', timeout: 60_000 });
  return { status: r.status, out: r.stdout, err: r.stderr };
}

/** The real ledger file with its floor set to what the script reads today — the control every plant moves one thing from. */
const atFloor = (runtime = reading.runtime, exp = reading.export.length, contract = reading.contract.length, ports = reading.ports.derivable): Json => ({
  ...read(path.join(PHASE, 'spec-ledger.json')),
  floor: { runtime, contract, export: exp, ports }
});

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-ledger-'));
  const r = ledger(['--json']);
  expect(r.status).toBe(0);
  reading = JSON.parse(r.out);
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

test('the reading counts the population the census counts, and splits it into graded, exempt and owed', () => {
  const census = read(path.join(PHASE, 'census.json'));
  expect(reading.population).toBe(census.population);
  const tiers = Object.values(reading.byTier as Record<string, { nodes: number; runtime: number; exempt: number; owed: number }>);
  expect(tiers.reduce((a, t) => a + t.nodes, 0)).toBe(census.population);
  expect(reading.runtime + reading.contract.length + reading.exempt.length + reading.owed.length).toBe(reading.population);
  expect(reading.runtime).toBe(reading.bySpec + reading.byGraph.length);
  // EXPORT_REACH is read from the helper's AST: the two latch nodes NSP-005 drove on the export
  expect(reading.export).toEqual(expect.arrayContaining(['Counter', 'Switch']));
});

test('the control: the floor at today\'s reading passes --check', () => {
  const r = ledger(['--check'], { ledger: atFloor() });
  expect({ status: r.status, err: r.err }).toEqual({ status: 0, err: '' });
  expect(r.out).toContain(`spec-ledger: holds at ${reading.runtime}/${reading.population}`);
});

describe('AC1 — the floor ratchets both ways', () => {
  test('a planted fall (the floor one above the reading) fails, named', () => {
    const r = ledger(['--check'], { ledger: atFloor(reading.runtime + 1) });
    expect(r.status).toBe(1);
    expect(r.err).toContain(`SPEC COVERAGE FELL on the runtime: ${reading.runtime} nodes conform, the floor is ${reading.runtime + 1}`);
  });
  test('a planted unraised rise (the floor one below the reading) fails, named', () => {
    const r = ledger(['--check'], { ledger: atFloor(reading.runtime - 1) });
    expect(r.status).toBe(1);
    expect(r.err).toContain(`SPEC COVERAGE ROSE on the runtime: ${reading.runtime} nodes conform, the floor is still ${reading.runtime - 1}`);
  });
  test('the export floor is held the same way', () => {
    const r = ledger(['--check'], { ledger: atFloor(undefined, reading.export.length + 1) });
    expect(r.status).toBe(1);
    expect(r.err).toContain('SPEC COVERAGE FELL on the export');
  });
});

describe('AC2 — the new-node gate, on a COPY of the catalog', () => {
  const fake = { typeName: 'zz.NSP009.FakeNode', displayName: 'Fake Node', category: 'Utilities', inNodePicker: true, isDeprecated: false, availableIn: ['browser'], inputs: [], outputs: [] };
  const catalogWithFake = (): Json => {
    const c = read(CATALOG);
    return { ...c, nodes: [...c.nodes, fake] };
  };

  test('a picker node with no spec, no graph claim, no exemption and no owed entry fails with its name', () => {
    const r = ledger(['--check'], { catalog: catalogWithFake(), ledger: atFloor() });
    expect(r.status).toBe(1);
    expect(r.err).toContain('NEW-NODE GATE: picker node "zz.NSP009.FakeNode" (Fake Node) has no spec, no graph claim, no exemption and no owed entry');
  });
  test('the control: the same node owed (a written reason) is past the gate — the census still wants it tiered', () => {
    const owedToo = atFloor();
    owedToo.owed = { ...owedToo.owed, [fake.typeName]: 'NSP-009 test — owed on purpose' };
    const r = ledger(['--check'], { catalog: catalogWithFake(), ledger: owedToo });
    expect(r.status).toBe(1);
    expect(r.err).not.toContain('NEW-NODE GATE');
    expect(r.err).toContain('picker node "zz.NSP009.FakeNode" (Fake Node) is not in census.json');
  });
  test('an owed node that is graded now must leave `owed`', () => {
    const counterOwed = atFloor();
    counterOwed.owed = { ...counterOwed.owed, Counter: 'NSP-009 test — owed although specced' };
    const r = ledger(['--check'], { ledger: counterOwed });
    expect(r.status).toBe(1);
    expect(r.err).toContain('"Counter" is graded on the runtime now (by its spec)');
  });
});

describe('AC3 — the ledger and the census count one population, both directions', () => {
  test('a picker node the census does not list fails, with the tier total beside it', () => {
    const census = read(path.join(PHASE, 'census.json'));
    const dropped = census.rows.find((r: Json) => r.typeName === 'Counter');
    const copy = { ...census, rows: census.rows.filter((r: Json) => r !== dropped), byTier: { ...census.byTier, [dropped.tier]: census.byTier[dropped.tier] - 1 } };
    const r = ledger(['--check'], { census: copy, ledger: atFloor() });
    expect(r.status).toBe(1);
    expect(r.err).toContain('picker node "Counter" is not in census.json');
    expect(r.err).toContain(`${dropped.tier}: the ledger counts ${census.byTier[dropped.tier]} picker nodes, census.json says ${census.byTier[dropped.tier] - 1}`);
  });
  test('a census row that is not a picker node fails', () => {
    const census = read(path.join(PHASE, 'census.json'));
    const copy = { ...census, rows: [...census.rows, { ...census.rows[0], typeName: 'zz.NSP009.Gone' }] };
    const r = ledger(['--check'], { census: copy, ledger: atFloor() });
    expect(r.status).toBe(1);
    expect(r.err).toContain('census.json lists "zz.NSP009.Gone", which is not a picker node');
  });
});

describe('NSP-017 AC3 — a contract spec is counted in a column of its own, never as a node that conforms', () => {
  test('the Function is specced as a contract: in `contract`, not in `runtime`, not owed', () => {
    expect(reading.contract).toContain('JavaScriptFunction');
    expect(reading.owed).not.toContain('JavaScriptFunction');
    // known-firing beside it: a behaviour spec of the same batch (the Expression) is counted in `runtime`, not as a contract
    expect(reading.contract).not.toContain('Expression');
    expect(reading.bySpec + reading.byGraph.length).toBe(reading.runtime);
  });

  test('the contract floor is held like the others: a planted fall fails, named', () => {
    const r = ledger(['--check'], { ledger: atFloor(reading.runtime, reading.export.length, reading.contract.length + 1) });
    expect(r.status).toBe(1);
    expect(r.err).toContain('SPEC COVERAGE FELL on the contract');
  });
});

describe('NSP-020 AC4 — ports drawable without a viewer', () => {
  test('the reading splits the population: by a spec (three classes), static, or not — each "not" with its reason', () => {
    const p = reading.ports as { derivable: number; by: Record<string, number>; not: Array<{ type: string; why: string }> };
    expect(Object.values(p.by).reduce((a, n) => a + n, 0)).toBe(p.derivable);
    expect(p.derivable + p.not.length).toBe(reading.population);
    for (const n of p.not) expect(n.why).toMatch(/no spec|the spec has no|drawn by no graded spec/);
    // s85 — `derived` is not drawing: Cloud Function and Navigate drew nothing from the project and had no oracle (a) row.
    // s87 (NSP-021) — both draw from the project now, graded by their editor adapters (oracle (c), ADAPTER_GRADED_TYPES)
    expect(p.not.map((n) => n.type)).not.toContain('CloudFunction2');
    expect(p.not.map((n) => n.type)).not.toContain('RouterNavigate');
    // …and the HTTP Request, whose Output Fields its spec does not draw (DRAWN_PORT_TYPES leaves it out)
    expect(p.not.map((n) => n.type)).toContain('net.noodl.HTTP');
    // known-firing on both sides: And draws its numbered inputs from the params and its wires; Component Inputs has no spec
    expect(p.not.map((n) => n.type)).toContain('Component Inputs');
    expect(p.not.map((n) => n.type)).not.toContain('And');
  });
  test('the ports floor is held like the others: a planted fall fails, named', () => {
    const r = ledger(['--check'], { ledger: atFloor(undefined, undefined, undefined, reading.ports.derivable + 1) });
    expect(r.status).toBe(1);
    expect(r.err).toContain('SPEC COVERAGE FELL on the ports');
  });
});
