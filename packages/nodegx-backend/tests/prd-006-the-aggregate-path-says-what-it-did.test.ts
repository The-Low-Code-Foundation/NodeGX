/**
 * PRD-006 — the aggregate path is bounded, and says what it did.
 *
 * Two routes answer with a LIST rather than a page: `?distinct=` and a grouped
 * aggregate. PRD-001 bounded the first and wrote the second's exemption down.
 * This task closes both ends, and the measurement that shaped it is worth
 * stating here because it contradicts the backlog item that started it:
 *
 *  🔴 **PRD-D7's array does not exist on the shipped adapter.** `$addToSet` is
 *  rewritten to the accessor `distinct`, and `QueryBuilder.buildAggregate`
 *  emits `COUNT(DISTINCT col)` for it — a scalar, commented in that file as
 *  "COUNT DISTINCT as alternative to $addToSet". `LocalSQLAdapter.aggregate`
 *  then reads ONE row and copies scalar columns out of it. The word `distinct`
 *  means a set of values in one file and a count of them in the other, and
 *  PRD-001 §7.6 read the first meaning into the second place. So the clamp
 *  below is a GUARD for an adapter that implements `$addToSet` as a set (a
 *  Postgres `array_agg` would), asserted against a stub that returns one — and
 *  it is inert on SQLite today. That is said out loud rather than dressed up
 *  as a repaired outage.
 *
 *  🔴 **The live defect was the other one.** `rawDistinct` has sliced at
 *  `maxLimit` since s3 and told nobody: the route answered `{ results }` with
 *  no header, which is the exact failure `ops/model.ts` names — "a list that
 *  looks complete and is not is worse than an error: it is believed" — shipped
 *  inside the task that wrote the rule. The HTTP half below is the measurement
 *  of that, and it fails against the s3 code.
 *
 * The facade half uses `defaultLimit: 5, maxLimit: 10` so the two numbers are
 * DIFFERENT and a clamp that reached for the wrong one is visible.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { IStorageAdapter } from '@noodl/backend-contract';

import type { IStorageFacade } from '@noodl/backend-contract';

import { mergeOpsConfig } from '../src/ops/model';
import { AdapterFacade } from '../src/persistence/AdapterFacade';
import type { RequestContext } from '../src/server/HttpServer';
import { ParseWireRoutes } from '../src/server/parse-wire';
import { BackendService } from '../src/service';

import { request } from './helpers/http';

jest.setTimeout(60000);

const TINY = { defaultLimit: 5, maxLimit: 10 };

/** A stub that answers `distinct`/`aggregate` with whatever the spec hands it. */
function stubAdapter(answers: {
  distinct?: unknown;
  aggregate?: Record<string, unknown>;
}): IStorageAdapter {
  return {
    distinct: (o: Record<string, unknown>) => (o.success as (v: unknown) => void)(answers.distinct),
    aggregate: (o: Record<string, unknown>) =>
      (o.success as (v: unknown) => void)(answers.aggregate)
  } as unknown as IStorageAdapter;
}

const facadeOf = (answers: Parameters<typeof stubAdapter>[0]) =>
  new AdapterFacade(stubAdapter(answers), () => TINY);

// ============================================================================
// 1. The facade — the bound, and the annotation that says it fired
// ============================================================================

describe('PRD-006 the facade bounds both list-shaped reads', () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => `v${i}`);

  it('AC3 — a shortened distinct reports the limit it was shortened to', async () => {
    const { values, cappedAt } = await facadeOf({ distinct: many(50) }).rawDistinct('T', 'city');
    expect(values.length).toBe(10);
    // 🔴 The mutant: clamping at `defaultLimit` (5). The two numbers differ in
    // TINY precisely so this is an assertion and not a coincidence.
    expect(cappedAt).toBe(TINY.maxLimit);
  });

  it('AC5 — a distinct that FITS is not annotated', async () => {
    const { values, cappedAt } = await facadeOf({ distinct: many(3) }).rawDistinct('T', 'city');
    expect(values.length).toBe(3);
    expect(cappedAt).toBeUndefined();
  });

  it('AC1 — an array-valued aggregate entry is bounded, and scalars beside it are untouched', async () => {
    // The shape a set-returning adapter would produce. SQLite cannot: see the
    // header of this file.
    const { result, cappedAt } = await facadeOf({
      aggregate: { cities: many(50), total: 91, biggest: 12 }
    }).rawAggregate('T', {});
    expect((result.cities as unknown[]).length).toBe(10);
    expect(result.total).toBe(91);
    expect(result.biggest).toBe(12);
    expect(cappedAt).toBe(TINY.maxLimit);
  });

  it('AC2 — an all-scalar aggregate is returned verbatim and is not annotated', async () => {
    // This IS the shipped SQLite shape, `$addToSet` included: one row of
    // scalars, `COUNT(DISTINCT …)` among them.
    const { result, cappedAt } = await facadeOf({
      aggregate: { avgN: 5.5, cityCount: 40_000 }
    }).rawAggregate('T', {});
    expect(result).toEqual({ avgN: 5.5, cityCount: 40_000 });
    expect(cappedAt).toBeUndefined();
  });

  it('an array that fits is left alone, boundary included', async () => {
    const { result, cappedAt } = await facadeOf({
      aggregate: { cities: many(TINY.maxLimit) }
    }).rawAggregate('T', {});
    expect((result.cities as unknown[]).length).toBe(TINY.maxLimit);
    expect(cappedAt).toBeUndefined();
  });
});

// ============================================================================
// 2. Over HTTP — the signal, which is the part that was missing
// ============================================================================

describe('PRD-006 over HTTP', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;

  // 12 rows: `n` is unique per row (12 distinct, above the ceiling of 10),
  // `g` takes three values (below it).
  const ROWS = 12;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-prd006-http-'));
    fs.writeFileSync(
      path.join(dataDir, 'ops.json'),
      JSON.stringify(mergeOpsConfig({ version: 1, queries: TINY }))
    );
    service = new BackendService({ dataDir, port: 0, backendId: 'prd006', backendName: 'PRD-006' });
    base = (await service.start()).listen.url;
    for (let i = 0; i < ROWS; i++) {
      await request(base, 'POST', '/api/Note', { body: { n: i, g: `g${i % 3}` } });
    }
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  const agg = (qs: string) =>
    request<{ results: Record<string, unknown>[] }>(base, 'GET', `/aggregate/Note?${qs}`);

  it('AC3 — a distinct above the ceiling is cut AND says so', async () => {
    const { status, json, headers } = await agg('distinct=n');
    expect(status).toBe(200);
    expect(json.results.length).toBe(TINY.maxLimit);
    expect(headers.get('x-nodegx-result-capped')).toBe('true');
    expect(headers.get('x-nodegx-result-limit')).toBe(String(TINY.maxLimit));
  });

  it('AC5 — a distinct that fits carries neither header', async () => {
    const { json, headers } = await agg('distinct=g');
    expect(json.results.length).toBe(3);
    expect(headers.get('x-nodegx-result-capped')).toBeNull();
    expect(headers.get('x-nodegx-result-limit')).toBeNull();
  });

  it('AC5 — a scalar grouped aggregate carries neither header', async () => {
    const group = encodeURIComponent(JSON.stringify({ total: { $sum: '$n' } }));
    const { json, headers } = await agg(`group=${group}`);
    expect(json.results[0].total).toBe(66); // 0..11
    expect(headers.get('x-nodegx-result-capped')).toBeNull();
  });

  it('$addToSet answers with a COUNT here, which is why PRD-D7 was not the defect', async () => {
    // Not an aspiration: the reading that redirected this task. If a future
    // adapter answers with the SET instead, this assertion is the one that
    // fails, and the facade clamp above it is already in place.
    const group = encodeURIComponent(JSON.stringify({ cities: { $addToSet: '$g' } }));
    const { json } = await agg(`group=${group}`);
    expect(json.results[0].cities).toBe(3);
  });

  it('AC6 — the annotation never reaches the Parse body', async () => {
    const { json, text } = await agg('distinct=n');
    expect(Object.keys(json)).toEqual(['results']);
    expect(text).not.toContain('cappedAt');
    expect(text).not.toContain('capped');
  });
});

// ============================================================================
// 3. AC4 — the GROUPED aggregate's header, which HTTP alone cannot reach
// ============================================================================

/**
 * 🔴 A gate shaped like the hole it is meant to cover.
 *
 * The §2 block cannot exercise this: SQLite answers every accessor with a
 * scalar, so `cappedAt` is always `undefined` over real HTTP and the grouped
 * branch's header line would be dead code that every green run walks past.
 * Removing `cappedHeaders(...)` from that one `sendJSON` was caught by nothing
 * until this block existed.
 *
 * So the facade is stubbed at the seam the route actually reads, and the route
 * is called directly with a response that records what it wrote.
 */
describe('PRD-006 AC4 the grouped aggregate emits the header', () => {
  const callAggregate = async (cappedAt: number | undefined) => {
    const written: { status?: number; headers?: Record<string, string> } = {};
    const facade = {
      rawAggregate: async () => ({ result: { cities: ['a', 'b'] }, cappedAt })
    } as unknown as IStorageFacade;

    const ctx = {
      params: { collection: 'Note' },
      query: { group: JSON.stringify({ cities: { $addToSet: '$g' } }) },
      acl: () => undefined,
      res: {
        writeHead: (status: number, headers: Record<string, string>) => {
          written.status = status;
          written.headers = headers;
        },
        end: () => undefined
      }
    } as unknown as RequestContext;

    await new ParseWireRoutes(facade, () => ({})).aggregate(ctx);
    return written;
  };

  it('a capped grouped aggregate carries both headers', async () => {
    const written = await callAggregate(10);
    expect(written.status).toBe(200);
    expect(written.headers?.['X-NodeGX-Result-Capped']).toBe('true');
    expect(written.headers?.['X-NodeGX-Result-Limit']).toBe('10');
  });

  it('an uncapped one carries neither (AC5)', async () => {
    const written = await callAggregate(undefined);
    expect(written.headers?.['X-NodeGX-Result-Capped']).toBeUndefined();
    expect(written.headers?.['X-NodeGX-Result-Limit']).toBeUndefined();
  });
});

// ============================================================================
// 4. AC7 — one spelling of the header name
// ============================================================================

describe('PRD-006 the header name is written once', () => {
  it('each header literal occurs exactly once in src/', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.ts')) files.push(full);
      }
    };
    walk(path.join(__dirname, '..', 'src'));

    // The QUOTED form only: the rule is about a second emitter, not about
    // prose. `ops/model.ts` and two docblocks name the header in text, and
    // should.
    const count = (needle: string) =>
      files.reduce((n, f) => n + fs.readFileSync(f, 'utf8').split(needle).length - 1, 0);

    expect(count("'X-NodeGX-Result-Capped'")).toBe(1);
    expect(count("'X-NodeGX-Result-Limit'")).toBe(1);
  });
});
