/**
 * GAM-007 — a data field called `on`, `get` or `data` reads as the data, or the door names it first.
 *
 * ## The row
 *
 * P78 D64: Rocket School's hangar drew no tiles. A shelf row's `on` field came back as the record's
 * event method, and all 252 gates passed because every gate fed the script plain JSON. The runtime
 * hands each Static Data row to the graph as a Noodl Object, whose proxy answers its own member
 * names first (`noodl-runtime/src/model.ts`).
 *
 * 🔒 R8 (Richard, 2026-09-14): C. Reserve the names loudly now, and data wins later.
 *
 * ## What each half grades
 *
 * 1. **The door's list is the runtime's.** `RESERVED_ROW_FIELD_NAMES` is spelled in the editor's
 *    validation layer, which cannot load the runtime. So it is compared here with the runtime's own
 *    `Model.isReservedFieldName` over every name a record could answer for itself.
 * 2. **The door speaks.** Written to disk and read back through `validate_component` and
 *    `validate_project`, and once through `create_component`. Every quiet arm carries
 *    `unsourced-image` from the same component in the same response, so "said nothing" is never
 *    "never ran".
 */
import * as fs from 'fs';
import * as path from 'path';

import { RESERVED_ROW_FIELD_NAMES } from '../../noodl-editor/src/editor/src/validation';
import { call, connect, copyFixture } from './helpers';
import type { TestSession } from './helpers';

const CODE = 'reserved-row-field';
const KNOWN_FIRING = 'unsourced-image';
const CARD_KEY = 'Card';
const CARD = '/Card';

interface Diagnostic {
  code: string;
  severity: string;
  message: string;
  suggestion?: string;
  location: { component: string; nodeId?: string; port?: string };
}
interface Report {
  summary: { errors: number; warnings: number; infos: number };
  diagnostics: Diagnostic[];
}

function writeNodes(projectDir: string, key: string, nodes: unknown[], visualRoots: string[]): void {
  const dir = path.join(projectDir, 'components', key);
  const nodesFile = path.join(dir, 'nodes.json');
  const existing = JSON.parse(fs.readFileSync(nodesFile, 'utf8'));
  fs.writeFileSync(nodesFile, JSON.stringify({ ...existing, nodes, visualRoots }, null, 2));
  fs.writeFileSync(
    path.join(dir, 'connections.json'),
    JSON.stringify({ ...JSON.parse(fs.readFileSync(path.join(dir, 'connections.json'), 'utf8')), connections: [] }, null, 2)
  );
}

/** A card with a Static Data shelf, and an Image whose empty `src` is the known-firing warning. */
function shelf(parameters: Record<string, unknown>): unknown[] {
  return [
    { id: 'card_root', type: 'Group', label: 'Shelf', children: ['card_photo'] },
    { id: 'card_photo', type: 'Image', label: 'Shelf photo', parent: 'card_root', parameters: { src: '' } },
    { id: 'shelf_data', type: 'Static Data', label: 'Hangar shelf', parameters }
  ];
}

const json = (rows: unknown[]) => ({ type: 'json', json: JSON.stringify(rows) });
const codes = (r: Report) => r.diagnostics.map((d) => d.code);
const ours = (r: Report) => r.diagnostics.filter((d) => d.code === CODE);

describe('GAM-007 AC2 — the door reserves exactly the names the runtime answers for itself', () => {
  it('RESERVED_ROW_FIELD_NAMES equals Model.isReservedFieldName over every candidate name', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const loaded = require('../../noodl-runtime/src/model');
    const RuntimeModel = loaded.default ?? loaded;
    const raw = new RuntimeModel('gam-007-candidates', {});
    raw.on('change', () => undefined);
    raw._class = 'probe';
    const candidates = new Set<string>([...Object.getOwnPropertyNames(raw), '__proto__']);
    for (let p = Object.getPrototypeOf(raw); p; p = Object.getPrototypeOf(p)) {
      for (const n of Object.getOwnPropertyNames(p)) candidates.add(n);
    }
    const runtime = [...candidates].filter((n) => RuntimeModel.isReservedFieldName(n)).sort();
    // Known-firing: the runtime answers for the name that bit, and not for `id`.
    expect([runtime.includes('on'), runtime.includes('id')]).toEqual([true, false]);
    expect([...RESERVED_ROW_FIELD_NAMES].sort()).toEqual(runtime);
  });
});

describe('GAM-007 AC4/AC5 — the door names a reserved row field before the app runs', () => {
  let session: TestSession | undefined;
  let dir = '';

  afterEach(async () => {
    await session?.close();
    session = undefined;
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
    dir = '';
  });

  async function open(parameters: Record<string, unknown>): Promise<TestSession> {
    dir = copyFixture();
    writeNodes(dir, CARD_KEY, shelf(parameters), ['card_root']);
    session = await connect(dir);
    return session;
  }

  const validate = async (s: TestSession) => (await call<Report>(s, 'validate_component', { path: CARD })).data;

  it('the D64 shelf: a JSON row carrying `on` is named, at the Static Data node, as a warning', async () => {
    const report = await validate(await open(json([{ id: 'cap', on: { 'pixel-art': { part: 'hat' } } }])));
    expect(codes(report)).toContain(KNOWN_FIRING);
    const found = ours(report);
    expect(found).toHaveLength(1);
    const [d] = found;
    expect(d.severity).toBe('warning');
    expect(d.location).toEqual(expect.objectContaining({ component: CARD, nodeId: 'shelf_data', port: 'json' }));
    expect(d.message).toContain('"on"');
    expect(d.suggestion).toContain('Rename "on"');
  });

  it('the renamed shelf (`faces`) is silent, beside the known-firing code', async () => {
    const report = await validate(await open(json([{ id: 'cap', faces: { 'pixel-art': { part: 'hat' } } }])));
    expect(codes(report)).toContain(KNOWN_FIRING);
    expect(ours(report)).toEqual([]);
  });

  it('twelve rows with `data` and `on` are one finding per field, in the order the rows name them', async () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, data: [i], on: true }));
    const report = await validate(await open(json(rows)));
    expect(ours(report).map((d) => d.message.match(/named "([^"]+)"/)?.[1])).toEqual(['data', 'on']);
  });

  it('a CSV header naming `on` is named at the `csv` port; `on` as a cell value is not', async () => {
    const header = await validate(await open({ csv: 'id,on,title\ncap,yes,Cap' }));
    expect(ours(header).map((d) => d.location.port)).toEqual(['csv']);
    await session?.close();
    fs.rmSync(dir, { recursive: true, force: true });

    const value = await validate(await open({ csv: 'id,title\ncap,on' }));
    expect(codes(value)).toContain(KNOWN_FIRING);
    expect(ours(value)).toEqual([]);
  });

  it('JSON rows the runtime does not read (Type unset reads CSV) are silent, and the same rows read as JSON are named', async () => {
    const unread = await validate(await open({ json: JSON.stringify([{ on: 1 }]) }));
    expect(codes(unread)).toContain(KNOWN_FIRING);
    expect(ours(unread)).toEqual([]);
    await session?.close();
    fs.rmSync(dir, { recursive: true, force: true });

    const read = await validate(await open({ type: 'json', json: JSON.stringify([{ on: 1 }]) }));
    expect(ours(read)).toHaveLength(1);
  });

  it('validate_project reports it exactly once', async () => {
    const s = await open(json([{ id: 'cap', on: 1 }]));
    const project = (await call<Report>(s, 'validate_project', {})).data;
    expect(codes(project)).toContain(KNOWN_FIRING);
    expect(ours(project)).toHaveLength(1);
  });
});

describe('GAM-007 AC4 — the write door carries it, and does not refuse over it', () => {
  it('create_component with a Static Data row carrying `on` is accepted and names the field', async () => {
    const dir = copyFixture();
    const session = await connect(dir);
    try {
      const res = await call<unknown>(session, 'create_component', {
        path: 'Data/Hangar',
        nodes: [
          { id: 'root', type: 'Group', label: 'Hangar' },
          {
            id: 'datahangarData',
            type: 'Static Data',
            label: 'Hangar shelf',
            parameters: json([{ id: 'cap', on: { 'pixel-art': { part: 'hat' } } }])
          }
        ],
        visual_roots: ['root']
      });
      expect(res.isError).toBe(false);
      const text = JSON.stringify(res.data);
      expect(text).toContain(CODE);
      expect(text).toContain('\\"on\\"');
    } finally {
      await session.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
