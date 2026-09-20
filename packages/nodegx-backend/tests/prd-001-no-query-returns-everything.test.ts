/**
 * PRD-001 — no query returns everything.
 *
 * The outage this task exists for needed no bug in the backend at all. A cloud function builds a
 * filter from an optional value and omits the key when the value is missing; an empty `where`
 * produces an empty clause; `QueryBuilder` emitted `LIMIT` only when the caller supplied one. So
 * an empty filter with no limit was `SELECT * FROM table`, four hundred thousand rows came back,
 * and the single-process backend went with them.
 *
 * What is asserted, in the two halves the design has:
 *
 *  1. **The limit handed to the adapter** (a recording stub, so the assertion is on the number
 *     itself rather than on a row count that could be right for the wrong reason): a missing
 *     limit becomes `defaultLimit`, a NEGATIVE one does too — `LIMIT -1` is "no limit" in SQLite,
 *     which is this outage spelled as a parameter — one above the ceiling becomes `maxLimit`, one
 *     below it is passed through untouched, and `limit: 0` STAYS 0 because Parse clients send
 *     `limit=0&count=1` to ask for a count and no rows.
 *  2. **`rawQueryAll` is exempt** — the §3.3 bypass, and the reason backup is not a catastrophe.
 *  3. **Over real HTTP**, on a backend configured with a tiny cap: a plain query returns a page
 *     and SAYS SO in `X-NodeGX-Result-Capped`; an over-ceiling request is clamped and not
 *     errored; a sub-cap request carries no signal at all; and the annotation never appears in
 *     the Parse body, which is shared with four unchanged clients.
 *  4. **AC5, the one that catches the worst possible version of this change**: a backup round
 *     trip of a table larger than `defaultLimit` keeps every row. A cap that reached `dataio`
 *     would produce a restore that looks fine and has silently lost data.
 *  5. `queries` is ops.json-configurable and an unknown key in it refuses start (AC6).
 *
 * The HTTP half runs with `defaultLimit: 5, maxLimit: 10` rather than the shipped 1,000/10,000:
 * the numbers are configuration, the MECHANISM is what is under test, and seeding 10,001 rows
 * over HTTP would spend the suite's budget proving arithmetic. The shipped defaults are asserted
 * separately, including that the facade's own fallback and `defaultOpsConfig()` agree.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { IStorageAdapter } from '@noodl/backend-contract';

import { exportCollection, importCollection } from '../src/backup/dataio';
import { defaultOpsConfig, mergeOpsConfig, validateOpsConfig } from '../src/ops/model';
import { AdapterFacade, DEFAULT_PAGE_CAP } from '../src/persistence/AdapterFacade';
import { createAdapter } from '../src/persistence/createAdapter';
import { BackendService } from '../src/service';

import { ParseQueryResult, ParseRecord, request } from './helpers/http';

jest.setTimeout(60000);

const TINY = { defaultLimit: 5, maxLimit: 10 };

// ============================================================================
// 1 + 2. The limit that reaches the adapter
// ============================================================================

/**
 * An adapter that records the options it was handed and answers with `rows`
 * rows — so an assertion can be about the LIMIT, not about a count that a
 * different bug could also produce.
 */
function recordingAdapter(rows: number): { adapter: IStorageAdapter; calls: Record<string, unknown>[] } {
  const calls: Record<string, unknown>[] = [];
  const answer = (options: Record<string, unknown>) => {
    calls.push(options);
    const limit = typeof options.limit === 'number' ? options.limit : rows;
    const n = Math.max(0, Math.min(rows, limit));
    const results = Array.from({ length: n }, (_, i) => ({ objectId: `id${i}` }));
    (options.success as (r: unknown[], c?: number) => void)(results, undefined);
  };
  const adapter = {
    query: answer,
    search: answer,
    distinct: (options: Record<string, unknown>) => {
      calls.push(options);
      (options.success as (v: unknown[]) => void)(Array.from({ length: rows }, (_, i) => `v${i}`));
    }
  } as unknown as IStorageAdapter;
  return { adapter, calls };
}

describe('PRD-001 the limit that reaches the adapter', () => {
  const facadeWith = (rows: number) => {
    const { adapter, calls } = recordingAdapter(rows);
    return { facade: new AdapterFacade(adapter, () => TINY), calls };
  };

  it('a query with no limit is bounded by defaultLimit, and says it was capped', async () => {
    const { facade, calls } = facadeWith(50);
    const result = await facade.rawQuery('T', {});
    expect(calls[0].limit).toBe(5);
    expect(result.results.length).toBe(5);
    expect(result.capped).toBe(true);
    expect(result.cappedAt).toBe(5);
  });

  it('a NEGATIVE limit is the same outage spelled differently, and is bounded too', async () => {
    // SQLite reads `LIMIT -1` as no limit at all. Left to the engine, `?limit=-1`
    // would be a one-parameter bypass of this entire task.
    const { facade, calls } = facadeWith(50);
    const result = await facade.rawQuery('T', { limit: -1 });
    expect(calls[0].limit).toBe(5);
    expect(result.capped).toBe(true);
  });

  it('a limit above the ceiling is clamped to maxLimit, not refused', async () => {
    const { facade, calls } = facadeWith(50);
    const result = await facade.rawQuery('T', { limit: 99_999 });
    expect(calls[0].limit).toBe(10);
    expect(result.results.length).toBe(10);
    expect(result.cappedAt).toBe(10);
  });

  it('a limit under the ceiling is passed through and is NOT marked capped (AC4)', async () => {
    // A caller that asked for 3 and got 3 is paging. Marking that capped would
    // make the signal meaningless on every well-behaved client.
    const { facade, calls } = facadeWith(50);
    const result = await facade.rawQuery('T', { limit: 3 });
    expect(calls[0].limit).toBe(3);
    expect(result.results.length).toBe(3);
    expect(result.capped).toBeUndefined();
    expect(result.cappedAt).toBeUndefined();
  });

  it('a result smaller than the cap is not marked capped (AC4)', async () => {
    const { facade } = facadeWith(2);
    const result = await facade.rawQuery('T', {});
    expect(result.results.length).toBe(2);
    expect(result.capped).toBeUndefined();
  });

  it('limit: 0 survives as 0 — the Parse count-only idiom', async () => {
    // `limit=0&count=1` is how every Parse client asks "how many?". Turning a 0
    // into defaultLimit would answer a count request with a page of records.
    const { facade, calls } = facadeWith(50);
    const result = await facade.rawQuery('T', { limit: 0 });
    expect(calls[0].limit).toBe(0);
    expect(result.results.length).toBe(0);
    expect(result.capped).toBeUndefined();
  });

  it('search is capped on the same rule as query', async () => {
    const { facade, calls } = facadeWith(50);
    const result = await facade.rawSearch('T', { search: 'x' });
    expect(calls[0].limit).toBe(5);
    expect(result.capped).toBe(true);
  });

  it('distinct is capped at the ceiling (AC7)', async () => {
    // PRD-006 gave this a shape: it used to return a bare array and truncate
    // without saying so. The SIGNAL is asserted in prd-006's spec; the BOUND is
    // this task's AC7 and stays here.
    const { facade } = facadeWith(50);
    expect((await facade.rawDistinct('T', 'city')).values.length).toBe(10);
  });

  it('rawQueryAll passes no limit at all, and passes a large one through verbatim (§3.3)', async () => {
    const { facade, calls } = facadeWith(50);
    const all = await facade.rawQueryAll('T', {});
    expect(calls[0].limit).toBeUndefined();
    expect(all.results.length).toBe(50);
    expect(all.capped).toBeUndefined();

    await facade.rawQueryAll('T', { limit: 1_000_000 });
    expect(calls[1].limit).toBe(1_000_000);
  });

  it('the facade fallback and the ops defaults are the same two numbers', async () => {
    // The facade declares its own defaults so `persistence/` need not import
    // `ops/`. This is what stops the two copies drifting.
    expect(DEFAULT_PAGE_CAP).toEqual(defaultOpsConfig().queries);
    expect(DEFAULT_PAGE_CAP).toEqual({ defaultLimit: 1000, maxLimit: 10_000 });

    // And an unconfigured facade really does use them.
    const { adapter, calls } = recordingAdapter(2000);
    await new AdapterFacade(adapter).rawQuery('T', {});
    expect(calls[0].limit).toBe(1000);
  });
});

// ============================================================================
// 4. AC5 — the round trip that catches the worst version of this change
// ============================================================================

describe('PRD-001 AC5 backup and export are not capped', () => {
  const dirs: string[] = [];
  afterAll(() => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

  const tmp = () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-prd001-'));
    dirs.push(d);
    return d;
  };

  it('a JSON round trip of a table larger than defaultLimit keeps every row', async () => {
    // 🔴 The mutant this is aimed at: `dataio.readAll` calling `rawQuery`
    // instead of `rawQueryAll`. That version restores cleanly and has lost
    // everything past the first page — a data loss an operator would learn
    // about from the rows that are not there.
    const src = tmp();
    const srcHandle = await createAdapter({ dataDir: src });
    // The tiny cap is what makes the failure visible in 12 rows rather than
    // 1,001: a cap that reached backup would truncate at 5.
    const srcFacade = new AdapterFacade(srcHandle.adapter, () => TINY);
    srcFacade.schemaManager.createTable({ name: 'Note', columns: [{ name: 'n', type: 'Number' }] });
    for (let i = 0; i < 12; i++) await srcFacade.rawCreate('Note', { n: i });

    const exported = await exportCollection(srcFacade, 'Note', 'json');
    expect(exported.count).toBe(12);
    await srcHandle.adapter.disconnect();

    const dst = tmp();
    const dstHandle = await createAdapter({ dataDir: dst });
    const dstFacade = new AdapterFacade(dstHandle.adapter, () => TINY);
    const report = await importCollection(dstFacade, 'Note', exported.content, { format: 'json' });
    expect(report.created).toBe(12);

    const restored = await dstFacade.rawQueryAll('Note', { sort: 'n' });
    expect(restored.results.map((r) => r.n)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    await dstHandle.adapter.disconnect();
  });
});

// ============================================================================
// 3 + 5. Over HTTP, and the config
// ============================================================================

describe('PRD-001 over HTTP', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;

  const ROWS = 12;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-prd001-http-'));
    fs.writeFileSync(
      path.join(dataDir, 'ops.json'),
      JSON.stringify(mergeOpsConfig({ version: 1, queries: TINY }))
    );
    service = new BackendService({ dataDir, port: 0, backendId: 'prd001', backendName: 'PRD-001' });
    base = (await service.start()).listen.url;
    for (let i = 0; i < ROWS; i++) {
      await request(base, 'POST', '/api/Note', { body: { n: i } });
    }
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const find = (body: Record<string, unknown>) =>
    request<ParseQueryResult<ParseRecord>>(base, 'POST', '/classes/Note', { body: { _method: 'GET', ...body } });

  it('AC1 — a query with no limit returns a page, and the header says so', async () => {
    const { status, json, headers } = await find({});
    expect(status).toBe(200);
    expect(json.results.length).toBe(TINY.defaultLimit);
    expect(headers.get('x-nodegx-result-capped')).toBe('true');
    expect(headers.get('x-nodegx-result-limit')).toBe(String(TINY.defaultLimit));
  });

  it('AC3 — the signal is a HEADER; the Parse body is unchanged (§3.2)', async () => {
    // The wire format is shared with four clients this task did not touch. A
    // new key in `{results, count}` is a key one of them may be iterating.
    const { json } = await find({});
    expect(Object.keys(json).sort()).toEqual(['results']);
    const asRecord = json as unknown as Record<string, unknown>;
    expect(asRecord.capped).toBeUndefined();
    expect(asRecord.cappedAt).toBeUndefined();
  });

  it('AC2 — a request above the ceiling is clamped, not errored', async () => {
    const { status, json, headers } = await find({ limit: TINY.maxLimit * 2 });
    expect(status).toBe(200);
    expect(json.results.length).toBe(TINY.maxLimit);
    expect(headers.get('x-nodegx-result-limit')).toBe(String(TINY.maxLimit));
  });

  it('AC4 — a sub-cap query carries no signal', async () => {
    const { json, headers } = await find({ limit: 3 });
    expect(json.results.length).toBe(3);
    expect(headers.get('x-nodegx-result-capped')).toBeNull();
    expect(headers.get('x-nodegx-result-limit')).toBeNull();
  });

  it('the count-only idiom still counts the whole matching set', async () => {
    // `limit=0&count=1`. The cap bounds the PAGE; it must not bound the answer
    // to "how many are there?", which is the question a capped client asks next.
    const { json, headers } = await find({ limit: 0, count: 1 });
    expect(json.results.length).toBe(0);
    expect(json.count).toBe(ROWS);
    expect(headers.get('x-nodegx-result-capped')).toBeNull();
  });

  it('GET /classes/:collection is capped on the same rule as the POST tunnel', async () => {
    const { json, headers } = await request<ParseQueryResult<ParseRecord>>(base, 'GET', '/classes/Note');
    expect(json.results.length).toBe(TINY.defaultLimit);
    expect(headers.get('x-nodegx-result-capped')).toBe('true');
  });

  it('the BYOB surface carries the same header, and the same body it always did', async () => {
    const byob = await request<{ results: unknown[]; count: number }>(
      base,
      'GET',
      `/api/Note?limit=${TINY.maxLimit * 100}`
    );
    expect(byob.json.results.length).toBe(TINY.maxLimit);
    expect(byob.headers.get('x-nodegx-result-capped')).toBe('true');
    expect(Object.keys(byob.json).sort()).toEqual(['count', 'results']);
  });

  it('AC6 — the numbers are ops.json config, and an unknown key in the section refuses', async () => {
    expect(validateOpsConfig(mergeOpsConfig({ version: 1, queries: TINY }))).toEqual([]);
    expect(validateOpsConfig({ version: 1, queries: { defaultLimit: 10, maxPages: 3 } })).toContain(
      'unknown key "maxPages" in queries'
    );
    expect(validateOpsConfig({ version: 1, queries: { defaultLimit: 0 } })).toContain(
      'queries.defaultLimit must be an integer >= 1'
    );
    expect(validateOpsConfig({ version: 1, queries: { defaultLimit: 500, maxLimit: 100 } }).length).toBe(1);
  });
});
