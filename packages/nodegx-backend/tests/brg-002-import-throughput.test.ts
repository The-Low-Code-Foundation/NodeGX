/**
 * BRG-002 AC3 — the import path's cost, measured before and after the batch.
 *
 * The number this exists to produce: importing 10,000 rows, which before BRG-002
 * was **one `existsSync` query per row** to classify created-vs-updated, plus
 * one `upsertSync` per row inside a synchronous transaction. The classification
 * pass is the expensive half and the easy win — N queries become one.
 *
 * This is a THROUGHPUT test, so it asserts correctness and prints timing rather
 * than asserting a duration: a wall-clock assertion on a shared developer
 * machine is a flake generator, and the number that matters is recorded in the
 * task file by a human reading this output, not enforced here.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { createAdapter } from '../src/persistence/createAdapter';
import { AdapterFacade } from '../src/persistence/AdapterFacade';
import { importCollection } from '../src/backup/dataio';

const ROWS = 10_000;

const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

function tmpDir(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'brg002-'));
  dirs.push(d);
  return d;
}

function payload(rows: number): string {
  const records: Record<string, unknown>[] = [];
  for (let i = 0; i < rows; i++) {
    records.push({ objectId: `row-${i}`, title: `title ${i}`, count: i, done: i % 2 === 0 });
  }
  return JSON.stringify({ format: 'nodegx-collection', version: 1, collection: 'Bulk', records });
}

describe(`BRG-002 — importing ${ROWS.toLocaleString()} rows`, () => {
  jest.setTimeout(300_000);

  it('imports, then re-imports the same rows as updates, and both are correct', async () => {
    const handle = await createAdapter({ dataDir: tmpDir() });
    const facade = new AdapterFacade(handle.adapter);
    facade.schemaManager.createTable({
      name: 'Bulk',
      columns: [
        { name: 'title', type: 'String' },
        { name: 'count', type: 'Number' },
        { name: 'done', type: 'Boolean' }
      ]
    });

    const content = payload(ROWS);

    // First import: every row is new, so the classification pass finds nothing
    // and the cost is dominated by the writes.
    const t0 = Date.now();
    const first = await importCollection(facade, 'Bulk', content, { format: 'json' });
    const firstMs = Date.now() - t0;

    expect(first.applied).toBe(true);
    expect(first.rejected).toEqual([]);
    expect(first.created).toBe(ROWS);
    expect(first.updated).toBe(0);

    // Second import: every row EXISTS, which is the case the per-row
    // `existsSync` loop made expensive — one query per row, all of them hits.
    const t1 = Date.now();
    const second = await importCollection(facade, 'Bulk', content, { format: 'json' });
    const secondMs = Date.now() - t1;

    expect(second.applied).toBe(true);
    expect(second.created).toBe(0);
    expect(second.updated).toBe(ROWS);

    // Idempotent: a re-import of the same objectIds must not duplicate rows.
    expect(await facade.rawCount('Bulk')).toBe(ROWS);

    // eslint-disable-next-line no-console
    console.log(`BRG-002 AC3 — ${ROWS} rows: first import ${firstMs} ms, re-import ${secondMs} ms`);

    await handle.adapter.disconnect();
  });
});
