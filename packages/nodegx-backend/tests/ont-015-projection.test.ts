/**
 * P116 ONT-015 §3.3 — the invoice sentence, from the world to the records, on SQLite and PostgreSQL,
 * over real sockets.
 *
 * The projection (`@nodegx/project-contract/world`) writes the read-aloud noun's answers as the
 * store's series on its `number` field; its held claim and `dropSeries` mutant run with every other
 * claim in `ont-003-claims.test.ts`. This file grades what needs the backend around it:
 *
 *   - **AC3, a number said of invoices that exist** — the migration route adds the field, then puts
 *     the series on it: the dry run counts the invoices it will number, the run numbers them in the
 *     order they were made, and the next create gets the number after them;
 *   - **AC3, a look said of numbers some invoices hold** — the ones that hold one keep it, the rest
 *     are numbered after the highest, and the counter starts above it;
 *   - **AC2** — a person's change to a number is ONT-014's 409 (the projection's `frozen`), a change
 *     to anything else on the invoice is not;
 *   - **the look is judged alike** — the world's validator (`numberLookProblem`) and the store's
 *     (`seriesProblem`) agree on every look listed;
 *   - **two mutants, each shown caught** — the numbers already held ignored, and the counter left
 *     where it was.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as series from '@noodl/runtime/src/api/adapters/series';
import type { WorldMigrateResponse } from '../src/server/admin-world';
import { BackendService } from '../src/service';
import { request } from './helpers/http';

// Relative on purpose, as ONT-003's spec: this package declares no dependency on the project contract.
import { numberLookProblem, planMigration, schemaPushes, type MigrationPlan, type WorldFiles, type WorldSchema } from '../../nodegx-project-contract/world';

jest.setTimeout(180000);

const FIXTURES = path.join(__dirname, '../../nodegx-project-contract/tests/fixtures');
function readWorld(fixture: string): WorldFiles {
  const dir = path.join(FIXTURES, fixture, 'docs/world');
  const read = (name: string) => JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8'));
  return { nouns: read('nouns'), relations: read('relations'), vocabulary: read('vocabulary') };
}

/** ONT-015 §1: "Invoice numbers look like INV-2026-0042 … never skips … starts again at 0001 each January." */
const INVOICE = { readAloud: true, looksLike: 'INV-{YYYY}-{####}', maySkip: false, restarts: 'each year' };
function withInvoice(answers: Record<string, unknown>): WorldFiles {
  const w: WorldFiles = JSON.parse(JSON.stringify(readWorld('world-bombshell-before')));
  w.nouns.nouns.push({
    id: 'invoice',
    name: 'Invoice',
    sentence: 'An invoice is what we send a company for what it owes.',
    properties: [{ name: 'amount', kind: 'number' }],
    answers: { onlyOne: false, calledBy: 'amount', history: false, secret: false, readAloud: false, ...answers }
  } as never);
  return w;
}
function plan(before: WorldFiles, after: WorldFiles): MigrationPlan {
  const out = planMigration(before, after);
  if (!out.ok) throw new Error(out.problems.join('\n'));
  return out.plan;
}
function schemaOf(files: WorldFiles): WorldSchema {
  const out = planMigration(files, files);
  if (!out.ok) throw new Error(out.problems.join('\n'));
  return out.plan.after;
}
const UNNUMBERED = withInvoice({});
const UNSAID = withInvoice({ readAloud: true });
const SAID = withInvoice(INVOICE);
const NUMBER_ADDED = plan(UNNUMBERED, SAID);
const LOOK_SAID = plan(UNSAID, SAID);
const year = String(new Date().getUTCFullYear());

const LOCKED = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'authenticated' },
    creatorOwns: false
  },
  collections: {},
  functions: {},
  files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
  signup: 'public'
};

// ------------------------------------------------------------------- engines --

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
const psql = (url: string, sql: string): void => void execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { stdio: 'ignore' });
let pgReachable = false;
try {
  psql(ADMIN_URL, 'SELECT 1');
  pgReachable = true;
} catch {
  pgReachable = false;
}
const STAMP = `${process.pid}_${Date.now().toString(36)}`;
let seq = 0;

interface Backend {
  req: <T = unknown>(method: string, p: string, body?: unknown, headers?: Record<string, string>) => Promise<{ status: number; json: T; text: string }>;
  ann: Record<string, string>;
  stop: () => Promise<void>;
}

/** A backend on a fresh database, the world `files` pushed through the schema route, and Ann signed up. */
async function startBackend(engine: 'sqlite' | 'postgres', files: WorldFiles): Promise<Backend> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-ont015p-'));
  fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED));
  fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
  let db: string | null = null;
  const previous = process.env.NODEGX_STORAGE_URL;
  if (engine === 'postgres') {
    db = `nodegx_ont015p_${STAMP}_${++seq}`;
    psql(ADMIN_URL, `CREATE DATABASE ${db}`);
    process.env.NODEGX_STORAGE_URL = ADMIN_URL.replace(/\/[^/?]*(\?|$)/, `/${db}$1`);
  } else delete process.env.NODEGX_STORAGE_URL;
  const service = new BackendService({ dataDir, port: 0, backendId: 'ont015p', backendName: 'ONT-015 projection', authToken: 't0k' });
  let base: string;
  try {
    base = (await service.start()).listen.url;
  } finally {
    if (previous === undefined) delete process.env.NODEGX_STORAGE_URL;
    else process.env.NODEGX_STORAGE_URL = previous;
  }
  const admin = { authorization: 'Bearer t0k' };
  const req: Backend['req'] = (method, p, body, headers = admin) => request(base, method, p, { body, headers }) as never;
  for (const push of schemaPushes(schemaOf(files))) {
    const r = await req('POST', '/admin/schema', { action: 'createTable', table: push.table, columns: push.columns, description: push.description, checks: push.checks, indexes: push.indexes });
    expect(r.status).toBe(200);
  }
  const signup = await req<{ sessionToken: string }>('POST', '/users', { username: 'ann', password: 'pw-ann' }, {});
  expect(signup.status).toBe(201);
  return {
    req,
    ann: { 'x-parse-session-token': signup.json.sessionToken },
    async stop() {
      await new Promise((r) => setTimeout(r, 250)); // the audit row is stamped without being awaited
      await service.stop();
      fs.rmSync(dataDir, { recursive: true, force: true });
      if (db) {
        try {
          psql(ADMIN_URL, `DROP DATABASE IF EXISTS ${db} WITH (FORCE)`);
        } catch {
          /* a leaked test database is not worth failing the run over */
        }
      }
    }
  };
}

/** Invoices made by the admin, one after another (createdAt is read to the millisecond). */
async function invoices(b: Backend, bodies: Array<Record<string, unknown>>): Promise<string[]> {
  const ids: string[] = [];
  for (const body of bodies) {
    const r = await b.req<{ objectId: string }>('POST', '/classes/Invoice', body);
    expect(r.status).toBe(201);
    ids.push(r.json.objectId);
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  return ids;
}
const numbers = async (b: Backend, ids: string[]): Promise<unknown[]> =>
  Promise.all(ids.map(async (id) => (await b.req<{ number?: unknown }>('GET', `/classes/Invoice/${id}`)).json.number));
const migrate = (b: Backend, p: MigrationPlan, run: boolean) =>
  b.req<WorldMigrateResponse & { error?: string }>('POST', '/admin/world/migrate', { plan: p, ...(run ? { run: true, backupTakenElsewhere: 'a copy in the ops drive', acceptLosses: true } : {}) });
/** A person's create: the store hands out the number, and the 201 says it. */
async function personMakes(b: Backend): Promise<{ status: number; number?: unknown; error?: unknown; value?: unknown }> {
  const r = await b.req<{ number?: unknown; error?: unknown; value?: unknown }>('POST', '/classes/Invoice', { amount: 1 }, b.ann);
  return { status: r.status, number: r.json.number, error: r.json.error, ...(r.json.value !== undefined ? { value: r.json.value } : {}) };
}

// ------------------------------------------------------------------ the plans --

describe('ONT-015 — the plans, before any engine', () => {
  it('a number said of invoices that exist: the field, then the series, then the unique rule and the freeze', () => {
    const steps = NUMBER_ADDED.steps.map((s) => ('schema' in s ? s.schema.action : Object.keys(s)[0]));
    expect(NUMBER_ADDED.refused).toEqual([]);
    expect(steps.indexOf('addColumn')).toBeLessThan(steps.indexOf('setSeries'));
    expect(steps.indexOf('setSeries')).toBeLessThan(steps.indexOf('setIndexes'));
    expect(steps).toContain('rules');
  });

  it('the look said of numbers already there: the series alone (and the words)', () => {
    expect(LOOK_SAID.steps.map((s) => ('schema' in s ? s.schema.action : Object.keys(s)[0]))).toEqual(['backup', 'setSeries', 'describeTable']);
  });

  it('the world’s validator and the store judge a look alike', () => {
    const looks: Array<[string, 'never' | 'each year' | 'each month' | undefined]> = [
      ['INV-{YYYY}-{####}', 'each year'],
      ['INV-{YYYY}-{####}', 'each month'],
      ['T-{YY}{MM}-{###}', 'each month'],
      ['T-{####}', undefined],
      ['T-{####}', 'each year'],
      ['T-{#}', 'never'],
      ['INV-{YYYY}', undefined],
      ['{##}-{##}', undefined],
      ['INV-{DD}-{####}', undefined],
      ['{YY}/{####}', 'each year'],
      ['plain', undefined]
    ];
    const verdicts = looks.map(([look, restarts]) => [
      look,
      restarts,
      numberLookProblem(look, restarts) === null,
      series.seriesProblem('number', { format: look, ...(restarts && restarts !== 'never' ? { restart: restarts === 'each year' ? 'year' : 'month' } : {}) }, 'String') === null
    ]);
    expect(verdicts.filter(([, , world, store]) => world !== store)).toEqual([]);
    expect(verdicts.filter(([, , world]) => world).length).toBe(5); // both kinds of answer are in the list
  });
});

// ------------------------------------------------------------------- suites --

for (const engine of ['sqlite', 'postgres'] as const) {
  const suite = engine === 'sqlite' || pgReachable ? describe : describe.skip;

  suite(`ONT-015 — the invoice sentence on the records, on ${engine}`, () => {
    afterEach(() => jest.restoreAllMocks());

    it('AC3: a number said of three invoices that exist — counted by the dry run, numbered in the order they were made, the next one after them', async () => {
      const b = await startBackend(engine, UNNUMBERED);
      try {
        const ids = await invoices(b, [{ amount: 30 }, { amount: 10 }, { amount: 20 }]);
        const dry = await migrate(b, NUMBER_ADDED, false);
        expect(dry.status).toBe(200);
        expect(dry.json.dryRun.moves).toEqual([{ says: expect.stringMatching(/number every invoice that has none/), rows: 3 }]);
        expect(await numbers(b, ids)).toEqual([undefined, undefined, undefined]);
        const ran = await migrate(b, NUMBER_ADDED, true);
        expect([ran.status, ran.json.ran, ran.json.error]).toEqual([200, true, undefined]);
        expect(await numbers(b, ids)).toEqual([`INV-${year}-0001`, `INV-${year}-0002`, `INV-${year}-0003`]);
        expect(await personMakes(b)).toEqual({ status: 201, number: `INV-${year}-0004`, error: undefined });
      } finally {
        await b.stop();
      }
    });

    it('AC3: the look said of numbers some invoices hold — those keep theirs, the rest follow the highest, and so does the counter', async () => {
      const b = await startBackend(engine, UNSAID);
      try {
        const ids = await invoices(b, [{ amount: 1 }, { amount: 2, number: `INV-${year}-0007` }, { amount: 3 }, { amount: 4, number: 'OLD-99' }]);
        const dry = await migrate(b, LOOK_SAID, false);
        expect(dry.json.dryRun.moves).toEqual([{ says: expect.any(String), rows: 2 }]);
        const ran = await migrate(b, LOOK_SAID, true);
        expect([ran.status, ran.json.ran, ran.json.error]).toEqual([200, true, undefined]);
        expect(await numbers(b, ids)).toEqual([`INV-${year}-0008`, `INV-${year}-0007`, `INV-${year}-0009`, 'OLD-99']);
        expect(await personMakes(b)).toEqual({ status: 201, number: `INV-${year}-0010`, error: undefined });
      } finally {
        await b.stop();
      }
    });

    it('AC2: a person changes an invoice’s amount, and not its number (the freeze the projection wrote, 409)', async () => {
      const b = await startBackend(engine, UNNUMBERED);
      try {
        expect((await migrate(b, NUMBER_ADDED, true)).json.ran).toBe(true);
        const made = await b.req<{ objectId: string; number: string }>('POST', '/classes/Invoice', { amount: 5 }, b.ann);
        expect(made.status).toBe(201);
        const renumber = await b.req('PUT', `/classes/Invoice/${made.json.objectId}`, { number: 'INV-1999-0001' }, b.ann);
        expect(renumber.status).toBe(409);
        expect((await b.req('PUT', `/classes/Invoice/${made.json.objectId}`, { amount: 6 }, b.ann)).status).toBe(200);
        expect(await numbers(b, [made.json.objectId])).toEqual([made.json.number]);
      } finally {
        await b.stop();
      }
    });

    it('mutant — the numbers already held ignored: the rest are numbered from 1 and the counter starts under the highest, so the test above goes red', async () => {
      const real = series.planNumbering;
      jest.spyOn(series, 'planNumbering').mockImplementation((s, rows, counters) => real(s, rows.filter((r) => r.value === null || r.value === undefined || r.value === ''), counters));
      const b = await startBackend(engine, UNSAID);
      try {
        const ids = await invoices(b, [{ amount: 1 }, { amount: 2, number: `INV-${year}-0007` }, { amount: 3 }]);
        expect((await migrate(b, LOOK_SAID, true)).json.ran).toBe(true);
        expect(await numbers(b, ids)).toEqual([`INV-${year}-0001`, `INV-${year}-0007`, `INV-${year}-0002`]);
      } finally {
        await b.stop();
      }
    });

    it('mutant — the counter left where it was: the next create is handed a number already given, and the unique rule refuses it', async () => {
      const real = series.planNumbering;
      jest.spyOn(series, 'planNumbering').mockImplementation((s, rows, counters) => ({ ...real(s, rows, counters), counters: [] }));
      const b = await startBackend(engine, UNNUMBERED);
      try {
        await invoices(b, [{ amount: 1 }, { amount: 2 }]);
        expect((await migrate(b, NUMBER_ADDED, true)).json.ran).toBe(true);
        const next = await personMakes(b);
        expect([next.status, next.number]).toEqual([409, undefined]);
        // P116-S22-SERIESMSG: the refusal names the number the store handed out, which the body never carried.
        expect(String(next.error)).toContain(`"number" is unique in "Invoice" and "INV-${year}-0001" is already used`);
        expect(next.value).toBe(`INV-${year}-0001`);
      } finally {
        await b.stop();
      }
    });
  });
}
