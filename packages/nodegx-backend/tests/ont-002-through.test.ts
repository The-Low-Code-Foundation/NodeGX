/**
 * P116 ONT-002 s14 — "through what?", graded on rows on SQLite and PostgreSQL.
 *
 * `world-owned-through` is the membership world with the person signing in and a note that is
 * its account's: "seen and changed by whoever holds the account". `ownerRule()` compiles the
 * rule from the files alone — the login the person projected, the chain the person gave
 * (membership as holder), back along the note's owner link — and this file runs it as the
 * `$path` the backend ANDs into a signed-in caller's query: a holder sees their accounts' notes,
 * another holder theirs, a member none. With the chain's "as holder" dropped by the engine
 * (`path-ignores-hop-filters`), the member sees them: the case is caught.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { IStorageAdapter, StorageColumn } from '@noodl/backend-contract';
import { formatFailures, runConformance, type ConformanceCase, type ConformanceContext, type Row } from '@noodl/backend-contract/conformance';
import { mutate } from '@noodl/backend-contract/conformance/mutants';

// Relative on purpose: this package declares no dependency on the project contract.
import { ownerRule, projectWorld, type WorldFiles, type WorldSchema } from '../../nodegx-project-contract/world';
import { createAdapter, type PersistenceHandle } from '../src/persistence/createAdapter';

jest.setTimeout(300000);

const FIXTURE = path.join(__dirname, '../../nodegx-project-contract/tests/fixtures/world-owned-through/docs/world');
const read = (name: string) => JSON.parse(fs.readFileSync(path.join(FIXTURE, `${name}.json`), 'utf8'));
const files: WorldFiles = { nouns: read('nouns'), relations: read('relations'), vocabulary: read('vocabulary') };
const projected = projectWorld(files);
if (!projected.ok) throw new Error(projected.problems.join('\n'));
const schema: WorldSchema = projected.schema;
const USERS = '_User';

const compiled = ownerRule(schema, files, 'note-account');
if (!compiled.ok) throw new Error(compiled.problem);
const rule = compiled;

async function seed(ctx: ConformanceContext): Promise<{ real: (n: string) => string; id: Record<string, string> }> {
  const names = new Map<string, string>();
  for (const c of schema.collections) names.set(c.name, ctx.collection(c.name));
  names.set(USERS, ctx.collection('Login'));
  const real = (name: string): string => names.get(name) ?? name;
  ctx.createTable(real(USERS), [{ name: 'username', type: 'String' }]);
  for (const c of schema.collections) {
    const columns: StorageColumn[] = c.columns.map((col) => ({
      name: col.name,
      type: col.type,
      ...(col.targetClass ? { targetClass: real(col.targetClass) } : {}),
      ...(col.required ? { required: true } : {})
    }));
    ctx.schema.createTable({ name: real(c.name), columns, description: c.description });
  }
  const id: Record<string, string> = {};
  const ptr = (collection: string, name: string): Row => ({ __type: 'Pointer', className: real(collection), objectId: id[name] });
  const at: Row = { __type: 'Date', iso: '2026-01-01T00:00:00.000Z' };
  const make = async (collection: string, name: string, data: Row): Promise<void> => {
    id[name] = String((await ctx.create(real(collection), data)).objectId);
  };
  await make('Company', 'acme', { name: 'Acme' });
  await make('Company', 'globex', { name: 'Globex' });
  for (const [account, company] of [['acme-main', 'acme'], ['acme-second', 'acme'], ['globex-main', 'globex']])
    await make('Account', account, { name: account, company: ptr('Company', company) });
  for (const name of ['ann', 'bob', 'cy']) {
    await make(USERS, `u-${name}`, { username: name });
    await make('Person', name, { name, login: ptr(USERS, `u-${name}`) });
  }
  const on = (person: string, account: string, role: string) =>
    make('Membership', `m-${person}-${account}`, { person: ptr('Person', person), account: ptr('Account', account), role, since: at });
  await on('ann', 'acme-main', 'holder');
  await on('ann', 'acme-second', 'holder');
  await on('bob', 'acme-main', 'member');
  await on('bob', 'acme-second', 'member');
  await on('cy', 'globex-main', 'holder');
  for (const [n, account] of [['n1', 'acme-main'], ['n2', 'acme-second'], ['n3', 'globex-main']])
    await make('Note', n, { text: n, owner: ptr('Account', account) });
  return { real, id };
}

const cases: ConformanceCase[] = [
  {
    id: 'world/the-rule-from-the-world-alone',
    area: 'paths',
    pins: "ONT-002 s14: an owned-by's rule compiled from the files — the login, the chain the person gave, back along the owner link",
    async run(ctx) {
      const s = await seed(ctx);
      const real = JSON.parse(JSON.stringify(rule.rule.path)) as { hops: Array<Record<string, unknown>>; maxDepth: number };
      for (const h of real.hops) if (typeof h.from === 'string') h.from = s.real(h.from);
      const sees = async (login: string): Promise<string> => {
        const where = { $path: { from: { collection: s.real(USERS), where: { objectId: s.id[login] } }, hops: real.hops, maxDepth: real.maxDepth } };
        const got = await ctx.query(s.real(rule.collection), { where });
        return JSON.stringify(got.results.map((x) => String(x.text)).sort());
      };
      const want: Array<[string, string[], string]> = [
        ['u-ann', ['n1', 'n2'], 'the holder of two accounts'],
        ['u-cy', ['n3'], 'the other holder'],
        ['u-bob', [], 'a member, not a holder']
      ];
      for (const [login, rows, who] of want) {
        const got = await sees(login);
        if (got !== JSON.stringify(rows)) throw new Error(`${who}: expected ${JSON.stringify(rows)}, got ${got}`);
      }
    }
  }
];

type Engine = { name: string; available: boolean; make: () => Promise<IStorageAdapter>; teardown: () => Promise<void> };
const handles: PersistenceHandle[] = [];
const dirs: string[] = [];
function sqlite(): Engine {
  return {
    name: 'local-sql (node:sqlite)',
    available: true,
    async make() {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ont002-through-'));
      dirs.push(dir);
      const h = await createAdapter({ dataDir: dir });
      handles.push(h);
      return h.adapter;
    },
    async teardown() {
      /* below */
    }
  };
}
const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
const DB_NAME = `nodegx_ont002_${process.pid}_${Date.now().toString(36)}`;
const psql = (url: string, sql: string): void => void execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { stdio: 'ignore' });
function pgReachable(): boolean {
  try {
    psql(ADMIN_URL, 'SELECT 1');
    return true;
  } catch {
    return false;
  }
}
function postgres(): Engine {
  const u = new URL(ADMIN_URL);
  u.pathname = `/${DB_NAME}`;
  let created = false;
  return {
    name: 'postgres',
    available: pgReachable(),
    async make() {
      if (!created) {
        psql(ADMIN_URL, `CREATE DATABASE "${DB_NAME}"`);
        created = true;
      }
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ont002-through-pg-'));
      dirs.push(dir);
      const h = await createAdapter({ dataDir: dir, storageUrl: u.toString() });
      handles.push(h);
      return h.adapter;
    },
    async teardown() {
      if (created) {
        try {
          psql(ADMIN_URL, `DROP DATABASE IF EXISTS "${DB_NAME}"`);
        } catch {
          /* a client still attached; the next run uses a new name */
        }
      }
    }
  };
}

const engines = [sqlite(), postgres()];
afterAll(async () => {
  for (const h of handles) {
    try {
      await h.adapter.disconnect();
    } catch {
      /* best-effort */
    }
  }
  for (const e of engines) await e.teardown();
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
});

for (const engine of engines) {
  const suite = engine.available ? describe : describe.skip;
  suite(`ONT-002 — through what, on ${engine.name}`, () => {
    it('the rule from the world alone gives each signed-in person the notes they hold', async () => {
      const report = await runConformance(engine.make, { adapter: engine.name }, { cases });
      if (report.failures.length) throw new Error(formatFailures(report));
      expect(report.passed).toBe(1);
    });

    it("with the chain's \"as holder\" ignored, the member sees the notes — caught", async () => {
      const report = await runConformance(async () => mutate(await engine.make(), 'path-ignores-hop-filters'), { adapter: `${engine.name} — mutant` }, { cases });
      expect(report.failures.length).toBe(1);
      expect(formatFailures(report)).toMatch(/a member, not a holder: expected \[\], got \["n1","n2"\]/);
    });
  });
}
