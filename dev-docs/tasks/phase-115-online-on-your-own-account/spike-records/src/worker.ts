/**
 * HST-006 spike: does the built-in backend's record store honour the backend contract on Cloudflare?
 *
 * The grader is the contract's own conformance suite (`@noodl/backend-contract/conformance`, BRG-003), the same one
 * `nodegx-backend/tests/brg-003-conformance-sqlite.test.ts` runs in Node. Here it runs INSIDE a SQLite-backed Durable
 * Object, against the unchanged LocalSQLAdapter, whose engine is the Durable Object's own SQLite (`doEngine.ts`).
 *
 *   GET /__conformance            run the suite in a fresh Durable Object, answer the report as JSON
 *   GET /__conformance?areas=a,b  only those areas
 *   GET /__exit                   records written through the adapter, its answers, and the database as an export file
 *   GET /__ops                    what one ordinary create / fetch / list / update / count costs in Cloudflare's
 *                                 billed rows (rows read, rows written), on a 4-column collection of 50 rows
 *
 * Both doors need `?key=<RUN_KEY>` when the Worker has a RUN_KEY var (set at deploy with `--var`, never committed),
 * so a stranger cannot spend the account's free rows. Each object deletes its own storage after a run.
 *
 * A fresh object per run (`idFromName` of a run id), so no run reads another's rows.
 */
import { DurableObject } from 'cloudflare:workers';
import { makeContext, runConformance, type ConformanceArea } from '@noodl/backend-contract/conformance';
import localSql from '@noodl/runtime/src/api/adapters/local-sql';
import { durableObjectEngine, newLedger, type DoStorage } from './doEngine';
import { exportDatabase } from './exit';

interface Env {
  RECORDS: {
    idFromName(name: string): unknown;
    get(id: unknown): { conformance(areas: string[] | null): Promise<unknown>; ops(): Promise<unknown>; exit(): Promise<unknown> };
  };
  RUN_KEY?: string;
}

type Storage = DoStorage & { deleteAll(): Promise<void> };

export class Records extends DurableObject {
  async conformance(areas: string[] | null): Promise<unknown> {
    const storage = (this.ctx as unknown as { storage: Storage }).storage;
    const ledger = newLedger();
    const started = Date.now();
    let adapter: { disconnect(): Promise<void> } | undefined;
    const report = await runConformance(
      async () => {
        const a = new localSql.LocalSQLAdapter('durable-object', { engine: durableObjectEngine(storage, ledger) });
        await a.connect();
        adapter = a;
        return a;
      },
      { adapter: 'local-sql on a Durable Object' },
      areas ? { areas: areas as ConformanceArea[] } : undefined
    );
    if (adapter) await adapter.disconnect().catch(() => undefined);
    await storage.deleteAll();
    return {
      adapter: report.adapter,
      total: report.total,
      passed: report.passed,
      failed: report.failed,
      skipped: report.skipped,
      wallMs: Date.now() - started,
      failures: report.failures.map((f) => ({ id: f.id, area: f.area, message: (f.message ?? '').slice(0, 400) })),
      byArea: tally(report.results),
      ledger
    };
  }

  async ops(): Promise<unknown> {
    const storage = (this.ctx as unknown as { storage: Storage }).storage;
    const ledger = newLedger();
    const adapter = new localSql.LocalSQLAdapter('durable-object', { engine: durableObjectEngine(storage, ledger) });
    await adapter.connect();
    const ctx = makeContext(adapter, 'ops' + Date.now().toString(36));
    const col = ctx.collection('Signup');
    const out: Record<string, { rowsRead: number; rowsWritten: number; statements: number }> = {};
    const measure = async (name: string, fn: () => Promise<unknown>) => {
      const r0 = ledger.rowsRead, w0 = ledger.rowsWritten, s0 = ledger.statements;
      await fn();
      out[name] = { rowsRead: ledger.rowsRead - r0, rowsWritten: ledger.rowsWritten - w0, statements: ledger.statements - s0 };
    };
    await measure('connect + create table', async () => {
      ctx.createTable(col, [
        { name: 'email', type: 'String' },
        { name: 'name', type: 'String' },
        { name: 'score', type: 'Number' },
        { name: 'done', type: 'Boolean' }
      ] as never);
    });
    const ids: string[] = [];
    await measure('seed 50 rows', async () => {
      for (let i = 0; i < 50; i++) ids.push(String((await ctx.create(col, { email: `p${i}@example.com`, name: `P ${i}`, score: i, done: i % 2 === 0 })).objectId));
    });
    await measure('create 1', () => ctx.create(col, { email: 'new@example.com', name: 'New', score: 1, done: false }));
    await measure('fetch 1 by id', () => ctx.fetch(col, ids[10]));
    await measure('list 20 where done = false', () => ctx.query(col, { where: { done: false }, limit: 20 } as never));
    await measure('update 1', () => ctx.save(col, ids[10], { score: 99 }));
    await measure('count where done = true', () => ctx.count(col, { done: true }));
    await measure('delete 1', () => ctx.remove(col, ids[11]));
    await adapter.disconnect().catch(() => undefined);
    await storage.deleteAll();
    return { ops: out, totals: { rowsRead: ledger.rowsRead, rowsWritten: ledger.rowsWritten, statements: ledger.statements }, otherErrors: ledger.otherErrors };
  }

  /**
   * The exit, graded: records written through the adapter, what the adapter answers for them, and the whole
   * database as an export file. `reimport.ts` loads the file into a Node backend and must get the same answers.
   */
  async exit(): Promise<unknown> {
    const storage = (this.ctx as unknown as { storage: Storage }).storage;
    const ledger = newLedger();
    const adapter = new localSql.LocalSQLAdapter('durable-object', { engine: durableObjectEngine(storage, ledger) });
    await adapter.connect();
    const ctx = makeContext(adapter, 'exit' + Date.now().toString(36));
    const learners = ctx.collection('Learner');
    const interactions = ctx.collection('Interaction');
    const badges = ctx.collection('Badge');
    ctx.createTable(learners, [
      { name: 'email', type: 'String' },
      { name: 'name', type: 'String' },
      { name: 'joined', type: 'Date' },
      { name: 'active', type: 'Boolean' }
    ] as never);
    ctx.createTable(interactions, [
      { name: 'learner', type: 'String' },
      { name: 'kind', type: 'String' },
      { name: 'score', type: 'Number' },
      { name: 'detail', type: 'Object' }
    ] as never);
    ctx.createTable(badges, [{ name: 'title', type: 'String' }] as never);
    const people: string[] = [];
    for (let i = 0; i < 12; i++) {
      const l = await ctx.create(learners, {
        email: `learner${i}@example.com`,
        name: i === 3 ? 'Zoë "quoted" O’Neil' : `Learner ${i}`,
        joined: { __type: 'Date', iso: new Date(Date.UTC(2026, 9, 1 + i)).toISOString() },
        active: i % 3 !== 0
      });
      people.push(String(l.objectId));
    }
    for (let i = 0; i < 40; i++) {
      await ctx.create(interactions, { learner: people[i % 12], kind: i % 2 ? 'quiz' : 'video', score: i * 2.5, detail: { step: i, tags: ['a', 'b'] } });
    }
    const gold = await ctx.create(badges, { title: 'gold' });
    const silver = await ctx.create(badges, { title: 'silver' });
    await ctx.addRelation(learners, people[0], 'badges', String(gold.objectId));
    await ctx.addRelation(learners, people[0], 'badges', String(silver.objectId));
    await ctx.addRelation(learners, people[5], 'badges', String(gold.objectId));
    // What the adapter answers on Cloudflare — the reimported Node backend must answer the same.
    const answers: Record<string, unknown> = {};
    for (const c of [learners, interactions, badges]) {
      answers[c] = (await ctx.query(c, { sort: ['objectId'], limit: 1000 } as never)).results;
    }
    answers['count active learners'] = await ctx.count(learners, { active: true });
    answers['quiz interactions score >= 50'] = (await ctx.query(interactions, { where: { kind: 'quiz', score: { $gte: 50 } }, sort: ['objectId'] } as never)).results.length;
    answers['badges of learner 0'] = (ctx.schema.getRelatedIds(learners, people[0], 'badges') as string[]).map(String).sort();
    answers['badges of learner 5'] = (ctx.schema.getRelatedIds(learners, people[5], 'badges') as string[]).map(String).sort();
    const file = exportDatabase(storage.sql);
    await adapter.disconnect().catch(() => undefined);
    await storage.deleteAll();
    return { collections: { learners, interactions, badges }, people: [people[0], people[5]], answers, file };
  }
}

function tally(results: Array<{ area: string; status: string }>): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const r of results) {
    out[r.area] ??= {};
    out[r.area][r.status] = (out[r.area][r.status] ?? 0) + 1;
  }
  return out;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (env.RUN_KEY && url.searchParams.get('key') !== env.RUN_KEY) return new Response('not found\n', { status: 404 });
    if (url.pathname === '/__exit') {
      const stub = env.RECORDS.get(env.RECORDS.idFromName('exit-' + Date.now() + '-' + Math.random()));
      try {
        return Response.json(await stub.exit());
      } catch (e) {
        return Response.json({ error: String((e as Error)?.stack ?? e) }, { status: 500 });
      }
    }
    if (url.pathname === '/__ops') {
      const stub = env.RECORDS.get(env.RECORDS.idFromName('ops-' + Date.now() + '-' + Math.random()));
      try {
        return Response.json(await stub.ops());
      } catch (e) {
        return Response.json({ error: String((e as Error)?.stack ?? e) }, { status: 500 });
      }
    }
    if (url.pathname === '/__conformance') {
      const areas = url.searchParams.get('areas');
      const stub = env.RECORDS.get(env.RECORDS.idFromName('run-' + Date.now() + '-' + Math.random()));
      try {
        const report = await stub.conformance(areas ? areas.split(',') : null);
        return Response.json(report);
      } catch (e) {
        return Response.json({ error: String((e as Error)?.stack ?? e) }, { status: 500 });
      }
    }
    return new Response('HST-006 spike: GET /__conformance\n', { status: 404 });
  }
};
