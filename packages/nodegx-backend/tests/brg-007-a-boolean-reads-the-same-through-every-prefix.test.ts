/**
 * BRG-007 — R7's gate: a declared `Boolean` reads back as `true`/`false` through
 * EVERY wire prefix, on one engine, with no PostgreSQL anywhere near it.
 *
 * 🔴 **One case per wire prefix, and that is the whole point of the file.**
 * BRG-003's 56-case conformance suite had no boolean round-trip at all, which is
 * how BRG-D8 crossed it; and a single case added to fill that hole would have
 * been written on whichever prefix its author reached for, passed, and left the
 * other prefix wrong — which is BRG-D10 exactly. So the surfaces are enumerated
 * here as a table and each one is read, rather than one being read as a proxy
 * for "the product".
 *
 * | read through | before R7, SQLite | after R7 |
 * |---|---|---|
 * | `GET /api/:table` (BYOB list + fetch) | **`1`** | `true` |
 * | `GET /classes/:c` (Parse-wire list + fetch) | `true` | `true` |
 * | `IStorageFacade.rawQuery` / `rawFetch` | **`1`** | `true` |
 * | `IStorageFacade.wireQuery` / `wireFetch` | `true` | `true` |
 *
 * The repair is in `_rowToRecord` (both adapters), so the facade's `raw*` half
 * changes underneath its internal callers too — `security/state`, `RoleStore`,
 * sessions and `McpRoutes.sessionForGraph`. That is deliberate and it is
 * already the shipped behaviour on PostgreSQL, where those same callers have
 * been reading real booleans since BRG-005. The `raw*` cases below are here so
 * that fact is asserted rather than assumed.
 *
 * Both arms are armed. A rule that reads the same value in both arms grades
 * nothing, so every surface is read on a row whose flag is `true` AND on a row
 * whose flag is `false` — a fix that returned `Boolean(value)` unconditionally
 * and a fix that returned `true` unconditionally are different, and only the
 * first passes here.
 *
 * And the control that says the repair is TYPE-DRIVEN and not a blanket
 * coercion: `views` is a `Number` holding exactly `1` and `0` in the same rows,
 * read through the same prefixes, and must still be `1` and `0`.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { AdapterFacade } from '../src/persistence/AdapterFacade';
import { createAdapter } from '../src/persistence/createAdapter';
import { adminHeaders, request } from './helpers/http';

jest.setTimeout(120_000);

/** The row that carries `true`, and the row that carries `false`. */
const PINNED_ROW = 'pinned-row';
const UNPINNED_ROW = 'unpinned-row';

interface NoteRow {
  objectId?: string;
  title?: string;
  pinned?: unknown;
  views?: unknown;
  note?: unknown;
}

describe('BRG-007 — a declared Boolean reads the same through every wire prefix (SQLite)', () => {
  let dataDir: string;
  let base: string;
  let service: BackendService;
  let ids: Record<string, string>;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brg007-prefixes-'));
    service = new BackendService({ dataDir, port: 0, backendId: 'brg007', backendName: 'brg007' });
    const started = await service.start();
    base = started.listen.url;

    const req = <T = unknown>(method: string, p: string, body?: unknown) =>
      request<T>(base, method, p, { body, headers: adminHeaders(dataDir) });

    await req('POST', '/admin/schema', {
      action: 'createTable',
      table: 'Note',
      columns: [
        { name: 'title', type: 'String' },
        // The subject.
        { name: 'pinned', type: 'Boolean' },
        // The control: a Number holding 1 and 0, which must NOT become a boolean.
        { name: 'views', type: 'Number' },
        // The second control: a String, which crosses unchanged already.
        { name: 'note', type: 'String' }
      ]
    });

    const created = await Promise.all([
      req<NoteRow>('POST', '/api/Note', { title: PINNED_ROW, pinned: true, views: 1, note: 'kept' }),
      req<NoteRow>('POST', '/api/Note', { title: UNPINNED_ROW, pinned: false, views: 0, note: 'kept' })
    ]);
    expect(created.map((r) => r.status)).toEqual([201, 201]);

    // The ids come from a route read rather than from the create responses, so a
    // create path that happens to answer correctly cannot stand in for a read.
    const listed = await req<{ results: NoteRow[] }>('GET', '/api/Note?limit=10');
    ids = {};
    for (const row of listed.json.results) ids[String(row.title)] = String(row.objectId);
    expect(Object.keys(ids).sort()).toEqual([PINNED_ROW, UNPINNED_ROW].sort());
  });

  afterAll(async () => {
    if (service) await service.stop();
    if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
  });

  /** Every read surface under test, named by the prefix a user would type. */
  async function readAll(title: string): Promise<Record<string, NoteRow>> {
    const headers = adminHeaders(dataDir);
    const id = ids[title];

    const apiList = await request<{ results: NoteRow[] }>(base, 'GET', '/api/Note?limit=10', { headers });
    const apiFetch = await request<NoteRow>(base, 'GET', `/api/Note/${id}`, { headers });
    const classesList = await request<{ results: NoteRow[] }>(base, 'GET', '/classes/Note?limit=10', { headers });
    const classesFetch = await request<NoteRow>(base, 'GET', `/classes/Note/${id}`, { headers });

    expect([apiList.status, apiFetch.status, classesList.status, classesFetch.status]).toEqual([200, 200, 200, 200]);

    const pick = (rows: NoteRow[]) => {
      const row = rows.find((r) => r.title === title);
      expect(row).toBeDefined();
      return row as NoteRow;
    };

    return {
      'GET /api/:table': pick(apiList.json.results),
      'GET /api/:table/:id': apiFetch.json,
      'GET /classes/:c': pick(classesList.json.results),
      'GET /classes/:c/:id': classesFetch.json
    };
  }

  it('🔴 R7 — every wire prefix answers `true` for a Boolean that is set', async () => {
    const surfaces = await readAll(PINNED_ROW);
    for (const [prefix, row] of Object.entries(surfaces)) {
      expect({ prefix, pinned: row.pinned }).toEqual({ prefix, pinned: true });
    }
  });

  it('🔴 R7 — and `false` for one that is not: the other arm, which a blanket `true` would fail', async () => {
    const surfaces = await readAll(UNPINNED_ROW);
    for (const [prefix, row] of Object.entries(surfaces)) {
      expect({ prefix, pinned: row.pinned }).toEqual({ prefix, pinned: false });
    }
  });

  it('the repair is type-driven: a Number holding 1 and 0 still reads 1 and 0 on every prefix', async () => {
    const set = await readAll(PINNED_ROW);
    const unset = await readAll(UNPINNED_ROW);
    for (const [prefix, row] of Object.entries(set)) {
      expect({ prefix, views: row.views }).toEqual({ prefix, views: 1 });
    }
    for (const [prefix, row] of Object.entries(unset)) {
      expect({ prefix, views: row.views }).toEqual({ prefix, views: 0 });
    }
    // And the String neither moved nor was coerced.
    expect(Object.values(set).map((r) => r.note)).toEqual(Object.values(set).map(() => 'kept'));
  });

  it('the two prefixes agree with each other — the assertion BRG-D10 was filed on', async () => {
    for (const title of [PINNED_ROW, UNPINNED_ROW]) {
      const s = await readAll(title);
      expect(s['GET /api/:table'].pinned).toBe(s['GET /classes/:c'].pinned);
      expect(s['GET /api/:table/:id'].pinned).toBe(s['GET /classes/:c/:id'].pinned);
    }
  });

  /**
   * The layer below the routes. `raw*` is storage-shaped on purpose and this
   * repair does not change that — a Pointer is still a bare id and a Date is
   * still an ISO string through `raw*`. What changes is that the DECLARED type
   * is applied where it was being dropped, which is a different claim, and the
   * one these two cases pin.
   */
  describe('the facade halves, which is where the internal callers read', () => {
    it('rawQuery / rawFetch carry the declared Boolean — as they already did on PostgreSQL', async () => {
      const handle = await createAdapter({ dataDir });
      const facade = new AdapterFacade(handle.adapter);
      try {
        const { results } = await facade.rawQuery('Note', { limit: 10 });
        const set = results.find((r) => r.title === PINNED_ROW) as NoteRow;
        const unset = results.find((r) => r.title === UNPINNED_ROW) as NoteRow;
        expect(set.pinned).toBe(true);
        expect(unset.pinned).toBe(false);
        // The control, one layer lower than the route cases above.
        expect(set.views).toBe(1);
        expect(unset.views).toBe(0);

        const fetched = (await facade.rawFetch('Note', ids[PINNED_ROW])) as NoteRow;
        expect(fetched.pinned).toBe(true);
      } finally {
        await handle.adapter.disconnect();
      }
    });

    it('wireQuery / wireFetch still carry it, unchanged — the half that was already right', async () => {
      const handle = await createAdapter({ dataDir });
      const facade = new AdapterFacade(handle.adapter);
      try {
        const { results } = await facade.wireQuery('Note', { limit: 10 });
        const set = results.find((r) => r.title === PINNED_ROW) as NoteRow;
        const unset = results.find((r) => r.title === UNPINNED_ROW) as NoteRow;
        expect(set.pinned).toBe(true);
        expect(unset.pinned).toBe(false);

        const fetched = (await facade.wireFetch('Note', ids[UNPINNED_ROW])) as NoteRow;
        expect(fetched.pinned).toBe(false);
      } finally {
        await handle.adapter.disconnect();
      }
    });
  });

  /**
   * The blast radius R7 named, read where a user would meet it. `_ApiKey.revoked`
   * is the one of the three this spec can reach without a mail round trip or an
   * upload, and `SecurityState.listApiKeys()` already wrapped it in `Boolean()`
   * by hand — so this case is also the record that the hand-wrap is now
   * redundant rather than load-bearing.
   *
   * 🔴 It creates the two keys it reads. A `for` loop over whatever `_ApiKey`
   * happened to hold is green over an empty table, and an empty table is
   * exactly what a fresh `dataDir` gives you — the assertion would have been
   * `all([])` and would have said nothing on either side of the repair.
   */
  it('a built-in Boolean reads the same way: `_ApiKey.revoked`, both arms', async () => {
    const headers = adminHeaders(dataDir);
    const live = await request<{ objectId: string }>(base, 'POST', '/admin/keys', {
      body: { name: 'brg007-live', scopes: ['classes:read'] },
      headers
    });
    const doomed = await request<{ objectId: string }>(base, 'POST', '/admin/keys', {
      body: { name: 'brg007-revoked', scopes: ['classes:read'] },
      headers
    });
    expect([live.status, doomed.status]).toEqual([201, 201]);
    const revokeRes = await request(base, 'DELETE', `/admin/keys/${doomed.json.objectId}`, { headers });
    expect(revokeRes.status).toBe(200);

    const handle = await createAdapter({ dataDir });
    const facade = new AdapterFacade(handle.adapter);
    try {
      const { results } = await facade.rawQuery('_ApiKey', { limit: 10 });
      const byId = new Map(results.map((r) => [String(r.objectId), r]));
      expect(byId.size).toBeGreaterThanOrEqual(2);
      expect(byId.get(live.json.objectId)?.revoked).toBe(false);
      expect(byId.get(doomed.json.objectId)?.revoked).toBe(true);
    } finally {
      await handle.adapter.disconnect();
    }
  });
});
