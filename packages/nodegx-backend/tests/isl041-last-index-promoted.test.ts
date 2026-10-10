/**
 * P109 ISL-041 — P99-HLT016-LASTINDEX: promoting a schema whose source removed a collection's LAST index left
 * that index on the target, which went on refusing rows the source accepts, and the result named it nowhere.
 *
 * `applyIndexes` returned early on an empty list, so a changed table whose declaration became `[]` never
 * reached `reconcileIndexes`. `applyChecks` already took a `whole` flag for exactly this.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { applySchema, diffSchema, SchemaSnapshot, snapshotFromLiveDir } from '../src/backup/schema-migrate';
import { createAdapter } from '../src/persistence/createAdapter';
import { AdapterFacade } from '../src/persistence/AdapterFacade';

describe('ISL-041 P99-HLT016-LASTINDEX — a promotion drops the last index the source removed', () => {
  let dir: string;
  let facade: AdapterFacade;
  let disconnect: () => Promise<void>;

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl041-'));
    const handle = await createAdapter({ dataDir: dir });
    facade = new AdapterFacade(handle.adapter);
    disconnect = () => handle.adapter.disconnect();
    fs.writeFileSync(path.join(dir, 'security.json'), JSON.stringify({ collections: {} }));
    facade.schemaManager.createTable({ name: 'Code', columns: [{ name: 'code', type: 'String' }] });
    facade.schemaManager.reconcileIndexes!('Code', [{ fields: ['code'], unique: true }]);
    await facade.rawCreate('Code', { code: 'A7' });
  });
  afterEach(async () => {
    await disconnect();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const promote = async (indexes: { fields: string[]; unique?: boolean }[]) => {
    const source: SchemaSnapshot = { tables: [{ name: 'Code', columns: [{ name: 'code', type: 'String' }], indexes }], permissions: {} } as SchemaSnapshot;
    const diff = diffSchema(source, snapshotFromLiveDir(facade.schemaManager, dir));
    return { diff, result: await applySchema({ schemaManager: facade.schemaManager, dataDir: dir }, source, diff, {}) };
  };

  it('known-firing: the unique index refuses a duplicate before the promotion', async () => {
    await expect(facade.rawCreate('Code', { code: 'A7' })).rejects.toThrow();
  });

  it('the source removed the last index: the promotion drops it, says so, and the duplicate is accepted', async () => {
    const { diff, result } = await promote([]);
    expect(diff.tables.changed.map((c) => c.name)).toEqual(['Code']);
    expect(result.droppedIndexes.length).toBe(1);
    expect(result.droppedIndexes[0]).toMatch(/^Code\./);
    await expect(facade.rawCreate('Code', { code: 'A7' })).resolves.toBeTruthy();
  });

  it('control: the source changed the index to a plain one — the non-empty path reconciles it, as it always did', async () => {
    const { result } = await promote([{ fields: ['code'] }]);
    expect(result.appliedIndexes).toEqual(['Code.idx_Code_code']);
    await expect(facade.rawCreate('Code', { code: 'A7' })).resolves.toBeTruthy();
  });
});
