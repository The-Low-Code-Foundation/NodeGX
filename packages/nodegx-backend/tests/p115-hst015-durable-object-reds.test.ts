/**
 * P115 HST-015 — the three Durable Object reds, graded in Node.
 *
 * The contract's conformance suite runs through the PRODUCT's Durable Object engine (`cloudflare/durableObjectSql.ts`)
 * over a stand-in for a Durable Object's storage built on `node:sqlite`. The stand-in refuses what Cloudflare refuses
 * (transaction statements sent as SQL, the journal PRAGMAs) and, like an object, cannot call JavaScript from SQL.
 *
 * What Node cannot refuse is Cloudflare's expression-depth cap of 100 (`node:sqlite` has no `sqlite3_limit`): every
 * statement a run sent is replayed, in order, through Python's `sqlite3` with `SQLITE_LIMIT_EXPR_DEPTH` set to 100,
 * and SQLite's own parser says which ones an object would refuse. Measured before the fix: the two five-hop path
 * cases' three statements, exactly the reds session 5 read on workerd (HST-006 §6.3).
 *
 * The three reds, and what grades each:
 *   1. regex (`filters/regex`, "no such function: nodegx_regexp"): the shapes the product writes itself ("contains",
 *      "starts with" …) are plain SQL on a text column, graded value by value against the JavaScript function; a
 *      real pattern is refused in a sentence before SQLite reads it.
 *   2. EXPRDEPTH: the replay finds no statement over depth 100, for the suite and for an eight-hop path (the most
 *      the contract allows) with the row rule at every hop.
 *   3. NOROLLBACKCASE: the new case `schema/a-change-that-fails-halfway-changes-nothing` is red on the engine as it
 *      was (no `atomic`, every SAVEPOINT dropped) and green on the product's; the ledger drops no statement.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  CONFORMANCE_CASES,
  formatFailures,
  runConformance,
  type ConformanceCase,
  type ConformanceReport
} from '@noodl/backend-contract/conformance';

// A `require`, as dbchange.test.ts does: an `import` of the runtime's SOURCE puts LocalSQLAdapter.ts in this
// package's typecheck (`typecheck:backend-tests`) under the backend's stricter settings, 96 errors in a file the
// runtime's own config passes (PR #54, 2026-11-11).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const localSql: {
  LocalSQLAdapter: new (path: string, options?: { engine: unknown }) => { connect(): Promise<void> };
} = require('../../noodl-runtime/src/api/adapters/local-sql');
import { durableObjectEngine, newLedger, type DoStorage, type EngineLedger } from '../cloudflare/durableObjectSql';
import { eightHopsCase, notPlainCase, stringFilterCase } from './helpers/hst015-cases';

jest.setTimeout(180000);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { DatabaseSync } = require('node:sqlite');

interface Sent {
  sql: string;
  params: unknown[];
}

/** A Durable Object's storage, as far as the engine reads it, on node:sqlite. Records every statement it is sent. */
function standInStorage(sent: Sent[]): DoStorage {
  const db = new DatabaseSync(':memory:');
  const exec = (query: string, ...bindings: unknown[]) => {
    if (/^\s*(BEGIN|COMMIT|END|ROLLBACK|SAVEPOINT|RELEASE)\b/i.test(query)) throw new Error('not authorized: use transactionSync');
    if (/^\s*PRAGMA\s+(journal_mode|secure_delete|wal_)/i.test(query)) throw new Error('not authorized');
    sent.push({ sql: query, params: bindings.map((b) => (b instanceof Uint8Array ? { $blob: Buffer.from(b).toString('base64') } : b)) });
    const stmt = db.prepare(query);
    let rows: Record<string, unknown>[];
    let written = 0;
    if (stmt.columns().length > 0) rows = stmt.all(...bindings);
    else {
      written = Number(stmt.run(...bindings).changes);
      rows = [];
    }
    return { toArray: () => rows, rowsRead: rows.length, rowsWritten: written };
  };
  let depth = 0;
  return {
    sql: { exec },
    transactionSync<T>(fn: () => T): T {
      // Nested calls nest (a savepoint inside), as an object's do; workerd is the reading that says so (HST-015 §5).
      const name = `ts${depth++}`;
      db.exec(`SAVEPOINT ${name}`);
      try {
        const r = fn();
        db.exec(`RELEASE ${name}`);
        return r;
      } catch (e) {
        db.exec(`ROLLBACK TO ${name}`);
        db.exec(`RELEASE ${name}`);
        throw e;
      } finally {
        depth--;
      }
    }
  };
}

/** Every statement replayed through Python's sqlite3 at an object's depth limit; the ones SQLite refuses for depth. */
const REPLAY = String.raw`
import sys, json, sqlite3, base64
sent = json.load(sys.stdin)
db = sqlite3.connect(':memory:', isolation_level=None)
db.setlimit(sqlite3.SQLITE_LIMIT_EXPR_DEPTH, 100)
too_deep = []
def arg(p):
    if isinstance(p, dict) and '$blob' in p: return base64.b64decode(p['$blob'])
    if isinstance(p, bool): return int(p)
    return p
for i, s in enumerate(sent):
    try:
        db.execute(s['sql'], [arg(p) for p in s['params']]).fetchall()
    except sqlite3.Error as e:
        if 'too large' in str(e): too_deep.append({'i': i, 'sql': s['sql'][:300], 'error': str(e)})
print(json.dumps({'statements': len(sent), 'limit': db.getlimit(sqlite3.SQLITE_LIMIT_EXPR_DEPTH), 'tooDeep': too_deep}))
`;

function replayAtDepth100(sent: Sent[]): { statements: number; limit: number; tooDeep: Array<{ i: number; sql: string; error: string }> } {
  const r = spawnSync('python3', ['-c', REPLAY], { input: JSON.stringify(sent), maxBuffer: 1 << 28, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`the depth replay could not run (needs python3 3.11+ for sqlite3.setlimit): ${r.stderr || r.error}`);
  return JSON.parse(r.stdout);
}

interface InObject {
  report: ConformanceReport;
  ledger: EngineLedger;
  sent: Sent[];
}

/** The suite (or `cases`) through the product's Durable Object engine; `today` strips `atomic`, as the engine was. */
async function runInObject(opts: { cases?: readonly ConformanceCase[]; only?: string[]; today?: boolean } = {}): Promise<InObject> {
  const ledger = newLedger();
  const sent: Sent[] = [];
  const storage = standInStorage(sent);
  const engine = durableObjectEngine(storage, ledger);
  if (opts.today) {
    const open = engine.open;
    engine.open = (p) => {
      const db = open(p);
      delete (db as { atomic?: unknown }).atomic;
      return db;
    };
  }
  const report = await runConformance(
    async () => {
      const a = new localSql.LocalSQLAdapter('hst015', { engine });
      await a.connect();
      return a as never;
    },
    { adapter: `local-sql in a Durable Object (stand-in${opts.today ? ', as it was' : ''})` },
    { cases: opts.cases, only: opts.only }
  );
  return { report, ledger, sent };
}

const tmpDirs: string[] = [];
afterAll(() => {
  for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
});

/** The same cases on node:sqlite, the reference: the functions registered, nothing refused. */
async function runOnNode(cases: readonly ConformanceCase[]): Promise<ConformanceReport> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hst015-node-'));
  tmpDirs.push(dir);
  return runConformance(
    async () => {
      const a = new localSql.LocalSQLAdapter(path.join(dir, 'db.sqlite'));
      await a.connect();
      return a as never;
    },
    { adapter: 'local-sql (node:sqlite)' },
    { cases }
  );
}

// ---------------------------------------------------------------------------------------------------------------

describe('P115 HST-015 — the three Durable Object reds', () => {
  let suite: InObject;
  beforeAll(async () => {
    suite = await runInObject();
  });

  it('AC1 — the whole conformance suite in a Durable Object: every case passes, none declared away', () => {
    if (suite.report.failures.length) throw new Error(formatFailures(suite.report));
    expect(suite.report.total).toBe(CONFORMANCE_CASES.length);
    expect(suite.report.passed).toBe(CONFORMANCE_CASES.length);
    expect(suite.report.failedAsDeclared).toBe(0);
  });

  it('EXPRDEPTH — no statement the suite sent is over a Durable Object’s depth of 100', () => {
    const depth = replayAtDepth100(suite.sent);
    expect(depth.limit).toBe(100);
    expect(depth.statements).toBeGreaterThan(5000); // the replay saw the run, not an empty list
    expect(depth.tooDeep).toEqual([]);
  });

  it('EXPRDEPTH — eight hops with the rule at every hop: answered, and under depth 100', async () => {
    const run = await runInObject({ cases: [eightHopsCase] });
    if (run.report.failures.length) throw new Error(formatFailures(run.report));
    const depth = replayAtDepth100(run.sent);
    expect(depth.tooDeep).toEqual([]);
    expect(run.sent.some((s) => /"_p\d+_h8"/.test(s.sql))).toBe(true); // the path ran, as eight joined steps
  });

  it('NOROLLBACKCASE — no transaction statement is dropped: every atomic block is a transactionSync', () => {
    expect(suite.ledger.droppedTransactionStatements).toEqual({});
    expect(suite.ledger.transactionSyncCalls).toBeGreaterThan(17); // 17 was db.transaction alone (HST-006 §6.2)
  });

  it('AC2 — the atomicity case is red on the engine as it was, and green on the product’s', async () => {
    const id = 'schema/a-change-that-fails-halfway-changes-nothing';
    const asItWas = await runInObject({ only: [id], today: true });
    expect(asItWas.report.failures.map((f) => f.id)).toEqual([id]);
    expect(asItWas.report.failures[0].message).toMatch(/half done|declared as a number|took the unique index away/);
    expect(Object.keys(asItWas.ledger.droppedTransactionStatements).length).toBeGreaterThan(0);
    const now = await runInObject({ only: [id] });
    expect(now.report.failures).toEqual([]);
    expect(now.report.passed).toBe(1);
  });

  it('regex — every string filter answers as the JavaScript function does, in Node and in the object', async () => {
    const onNode = { plain: 0, viaFunction: 0, refused: 0 };
    const nodeReport = await runOnNode([stringFilterCase(true, onNode)]);
    if (nodeReport.failures.length) throw new Error(`node:sqlite\n${formatFailures(nodeReport)}`);

    const inObject = { plain: 0, viaFunction: 0, refused: 0 };
    const run = await runInObject({ cases: [stringFilterCase(false, inObject)] });
    if (run.report.failures.length) throw new Error(`Durable Object\n${formatFailures(run.report)}`);

    // The grid is not trivially one-sided: most asks are plain SQL, and some are not (and are refused in the object).
    expect(inObject.plain).toBeGreaterThan(150);
    expect(inObject.viaFunction).toBeGreaterThan(10);
    expect(inObject.refused).toBe(inObject.viaFunction);
    expect(onNode).toEqual({ ...inObject, refused: 0 });
    // No statement in the object called the function it does not have.
    expect(run.sent.some((s) => s.sql.includes('nodegx_regexp('))).toBe(false);
  });

  it('regex — a pattern on a number field and a map filter are refused in words in the object', async () => {
    const run = await runInObject({ cases: [notPlainCase] });
    if (run.report.failures.length) throw new Error(formatFailures(run.report));
  });
});
