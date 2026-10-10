/**
 * P116-S14-pgloadrace — a PostgreSQL backend starting while another backend on the same database
 * drops a junction table refused to start: its load lists the tables, then reads each junction,
 * and a junction dropped in between was "no such table" — the backend came up as `failed`.
 *
 * Deterministic: a second connection holds `DROP TABLE <junction>` uncommitted, so the new
 * backend's listing still sees the junction and its read waits on the lock; the drop is then
 * committed under it. The backend must come up, without the junction and its links.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Client } = require('pg');

import { createAdapter, type PersistenceHandle } from '../src/persistence/createAdapter';

jest.setTimeout(60000);

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
const DB = `nodegx_p116race_${process.pid}_${Date.now().toString(36)}`;
const psql = (url: string, sql: string): void => void execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { stdio: 'ignore' });
const reachable = (): boolean => {
  try {
    psql(ADMIN_URL, 'SELECT 1');
    return true;
  } catch {
    return false;
  }
};

const suite = reachable() ? describe : describe.skip;
suite('P116-S14-pgloadrace — a junction dropped while a backend loads', () => {
  const handles: PersistenceHandle[] = [];
  const dirs: string[] = [];
  const url = (() => {
    const u = new URL(ADMIN_URL);
    u.pathname = `/${DB}`;
    return u.toString();
  })();
  const open = async (): Promise<PersistenceHandle> => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p116race-'));
    dirs.push(dir);
    const h = await createAdapter({ dataDir: dir, storageUrl: url });
    handles.push(h);
    return h;
  };

  beforeAll(() => psql(ADMIN_URL, `CREATE DATABASE "${DB}"`));
  afterAll(async () => {
    for (const h of handles) await h.adapter.disconnect().catch(() => undefined);
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
    try {
      psql(ADMIN_URL, `DROP DATABASE IF EXISTS "${DB}"`);
    } catch {
      /* a client still attached */
    }
  });

  it('comes up without the junction, and without its links', async () => {
    const a = await open();
    const sm = a.adapter.schemaManager!;
    sm.createTable({ name: 'Post', columns: [{ name: 'title', type: 'String' }] });
    sm.addRelation('Post', 'p1', 'tags', 't1');
    sm.addRelation('Post', 'p1', 'keep', 't2');
    await (sm as unknown as { barrier: () => Promise<void> }).barrier();

    const other = new Client({ connectionString: url });
    await other.connect();
    try {
      await other.query('BEGIN');
      await other.query('DROP TABLE "_Join_tags_Post"');
      const starting = open();
      // Let the load list the tables (the drop is not committed, so the junction is listed) and
      // block reading it on the drop's lock.
      await new Promise((r) => setTimeout(r, 750));
      await other.query('COMMIT');
      const b = await starting;
      const sb = b.adapter.schemaManager!;
      expect(sb.getRelatedIds('Post', 'p1', 'tags')).toEqual([]);
      expect(sb.getRelatedIds('Post', 'p1', 'keep')).toEqual(['t2']);
    } finally {
      await other.end();
    }
  });
});
