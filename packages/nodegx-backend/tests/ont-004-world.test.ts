/**
 * P116 ONT-004 AC1 — a membership business's four paths, from the person's sentences to rows,
 * on SQLite and on PostgreSQL.
 *
 * `tests/fixtures/world-membership` is the business's shape in the vocabulary (ONT-000, R6:
 * synthetic people). `projectWorld()` makes its schema; `worldPath()` compiles each sentence
 * to the contract's `$path`; this file applies the schema through the schema surface, seeds
 * rows, runs the compiled paths through the conformance runner on both engines, and asserts
 * the rows. Then it runs the same cases on the three path mutants of `conformance/mutants.ts`
 * (a start filter dropped, hop filters dropped, the depth bound ignored) and asserts each is
 * caught — a suite that cannot fail proves nothing.
 *
 * The permission rule (AC3) is the fourth sentence as a `path` atom: compiled by `worldRule()`
 * from the login the projection made (`SignedUp.doneBy`), and graded here as the `$path` the
 * backend ANDs into a holder's query. The HTTP half — the rule in `security.json`, enforced
 * on a locked backend — is `tests/ont-004-rule.test.ts`.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { IStorageAdapter, StorageColumn } from '@noodl/backend-contract';
import {
  formatFailures,
  runConformance,
  type ConformanceCase,
  type ConformanceContext,
  type ConformanceReport,
  type Row
} from '@noodl/backend-contract/conformance';
import { mutate, type MutationKind } from '@noodl/backend-contract/conformance/mutants';

// Relative on purpose: this package declares no dependency on the project contract.
import {
  projectWorld,
  worldPath,
  worldRule,
  type PathSentence,
  type WorldFiles,
  type WorldSchema
} from '../../nodegx-project-contract/world';
import { createAdapter, type PersistenceHandle } from '../src/persistence/createAdapter';

jest.setTimeout(300000);

const FIXTURE = path.join(__dirname, '../../nodegx-project-contract/tests/fixtures/world-membership/docs/world');
function readWorld(): WorldFiles {
  const read = (name: string) => JSON.parse(fs.readFileSync(path.join(FIXTURE, `${name}.json`), 'utf8'));
  return { nouns: read('nouns'), relations: read('relations'), vocabulary: read('vocabulary') };
}
const files = readWorld();
const projected = projectWorld(files);
if (!projected.ok) throw new Error(projected.problems.join('\n'));
const schema: WorldSchema = projected.schema;

const USERS = '_User';

/** The seeded world under one run's fresh names. */
interface Seeded {
  real: (name: string) => string;
  id: Record<string, string>;
}

async function seed(ctx: ConformanceContext): Promise<Seeded> {
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
    if (c.checks.length && typeof ctx.schema.reconcileChecks === 'function')
      ctx.schema.reconcileChecks(real(c.name), c.checks);
  }

  const id: Record<string, string> = {};
  const ptr = (collection: string, name: string): Row => ({
    __type: 'Pointer',
    className: real(collection),
    objectId: id[name]
  });
  const at: Row = { __type: 'Date', iso: '2026-01-01T00:00:00.000Z' };
  const make = async (collection: string, name: string, data: Row): Promise<void> => {
    const row = await ctx.create(real(collection), data);
    id[name] = String(row.objectId);
  };

  await make('Company', 'acme', { name: 'Acme' });
  await make('Company', 'globex', { name: 'Globex' });
  await make('Account', 'acme-main', { name: 'acme-main', company: ptr('Company', 'acme') });
  await make('Account', 'acme-second', { name: 'acme-second', company: ptr('Company', 'acme') });
  await make('Account', 'globex-main', { name: 'globex-main', company: ptr('Company', 'globex') });
  for (const name of ['ann', 'bob', 'cy', 'di', 'eve']) await make('Person', name, { name });
  for (const name of ['ann', 'bob', 'cy']) {
    await make(USERS, `u-${name}`, { username: name });
    await make('SignedUp', `s-${name}`, { person: ptr('Person', name), at, doneBy: ptr(USERS, `u-${name}`) });
  }
  const on = (person: string, account: string, role: string) =>
    make('Membership', `m-${person}-${account}`, {
      person: ptr('Person', person),
      account: ptr('Account', account),
      role,
      since: at
    });
  await on('ann', 'acme-main', 'holder');
  await on('ann', 'acme-second', 'holder');
  await on('bob', 'acme-main', 'member');
  await on('bob', 'acme-second', 'member');
  await on('eve', 'acme-main', 'member');
  await on('cy', 'globex-main', 'holder');
  const works = (person: string, company: string) =>
    make('Employment', `e-${person}`, { person: ptr('Person', person), company: ptr('Company', company), since: at });
  await works('ann', 'acme');
  await works('bob', 'acme');
  await works('di', 'acme');
  await works('cy', 'globex');
  await works('eve', 'globex');
  await make('Tag', 'algebra', { label: 'algebra' });
  await make('Tag', 'geometry', { label: 'geometry' });
  await make('Session', 's1', { title: 's1', person: [id.ann, id.cy] });
  await make('Session', 's2', { title: 's2', person: [] });
  await ctx.addRelation(real('Session'), id.s1, 'tag', id.algebra);
  await ctx.addRelation(real('Session'), id.s2, 'tag', id.geometry);
  await make('Attended', 'a-ann-s1', { person: ptr('Person', 'ann'), session: ptr('Session', 's1'), at });
  await make('Attended', 'a-cy-s1', { person: ptr('Person', 'cy'), session: ptr('Session', 's1'), at });
  await make('Attended', 'a-bob-s2', { person: ptr('Person', 'bob'), session: ptr('Session', 's2'), at });
  await make('Topic', 'root', { title: 'root' });
  await make('Topic', 'a', { title: 'a', parent: ptr('Topic', 'root') });
  await make('Topic', 'b', { title: 'b', parent: ptr('Topic', 'a') });
  await make('Topic', 'c', { title: 'c', parent: ptr('Topic', 'b') });
  return { real, id };
}

/** A compiled path's collections under the run's names. */
function renamed(real: (n: string) => string, p: Record<string, unknown>): Record<string, unknown> {
  const out = JSON.parse(JSON.stringify(p)) as { from: { collection: string }; hops: Array<Record<string, unknown>> };
  out.from.collection = real(out.from.collection);
  for (const h of out.hops) {
    if (typeof h.from === 'string') h.from = real(h.from);
    if (typeof h.to === 'string') h.to = real(h.to);
  }
  return out;
}

function compile(sentence: PathSentence) {
  const c = worldPath(schema, files, sentence);
  if (!c.ok) throw new Error(c.problem);
  return c.compiled;
}

const label = (collection: string): string =>
  collection === 'Session' || collection === 'Topic' ? 'title' : collection === 'Tag' ? 'label' : 'name';

async function ask(ctx: ConformanceContext, s: Seeded, sentence: PathSentence): Promise<string[]> {
  const compiled = compile(sentence);
  const got = await ctx.query(s.real(compiled.collection), {
    where: { $path: renamed(s.real, compiled.path as unknown as Record<string, unknown>) }
  });
  return got.results.map((r) => String(r[label(compiled.collection)])).sort();
}

function expectRows(got: string[], want: string[], what: string): void {
  if (JSON.stringify(got) !== JSON.stringify(want))
    throw new Error(`${what}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
}

const HOLDER: PathSentence['steps'] = [
  { relation: 'membership', where: { role: 'holder' } },
  { relation: 'membership', back: true }
];

const cases: ConformanceCase[] = [
  {
    id: 'world/1-accounts-of-a-company',
    area: 'paths',
    pins: 'census path 1 — accounts whose company is named Acme',
    async run(ctx) {
      const s = await seed(ctx);
      expectRows(
        await ask(ctx, s, { from: 'company', where: { name: 'Acme' }, steps: [{ relation: 'account-company' }] }),
        ['acme-main', 'acme-second'],
        'path 1'
      );
    }
  },
  {
    id: 'world/2-accounts-with-a-member',
    area: 'paths',
    pins: 'census path 2 — accounts with a member named eve',
    async run(ctx) {
      const s = await seed(ctx);
      expectRows(
        await ask(ctx, s, { from: 'person', where: { name: 'eve' }, steps: [{ relation: 'membership' }] }),
        ['acme-main'],
        'path 2'
      );
    }
  },
  {
    id: 'world/3-what-a-holder-sees',
    area: 'paths',
    pins: 'census path 3 — the people an account holder may see, four hops, "as holder" kept',
    async run(ctx) {
      const s = await seed(ctx);
      expectRows(
        await ask(ctx, s, { from: 'person', where: { name: 'ann' }, steps: HOLDER }),
        ['ann', 'bob', 'eve'],
        'ann'
      );
      expectRows(await ask(ctx, s, { from: 'person', where: { name: 'cy' }, steps: HOLDER }), ['cy'], 'cy');
      expectRows(await ask(ctx, s, { from: 'person', where: { name: 'bob' }, steps: HOLDER }), [], 'bob, a member');
    }
  },
  {
    id: 'world/4-members-on-my-accounts-companies',
    area: 'paths',
    pins: "census path 4 — the members on my account's companies, five hops",
    async run(ctx) {
      const s = await seed(ctx);
      const sentence: PathSentence = {
        from: 'person',
        where: { name: 'ann' },
        steps: [
          { relation: 'membership', where: { role: 'holder' } },
          { relation: 'account-company' },
          { relation: 'employment', back: true }
        ]
      };
      expectRows(await ask(ctx, s, sentence), ['ann', 'bob', 'di'], 'path 4');
    }
  },
  {
    id: 'world/links-list-tree-and-event',
    area: 'paths',
    pins: 'the other link shapes the kinds make: a Links both ways, a list forwards, a tree to its bound, an event crossed',
    async run(ctx) {
      const s = await seed(ctx);
      expectRows(
        await ask(ctx, s, { from: 'tag', where: { label: 'algebra' }, steps: [{ relation: 'session-tags' }] }),
        ['s1'],
        'sessions tagged algebra'
      );
      expectRows(
        await ask(ctx, s, { from: 'session', where: { title: 's2' }, steps: [{ relation: 'session-tags' }] }),
        ['geometry'],
        'tags of s2'
      );
      expectRows(
        await ask(ctx, s, { from: 'session', where: { title: 's1' }, steps: [{ relation: 'session-speakers' }] }),
        ['ann', 'cy'],
        'speakers listed on s1'
      );
      expectRows(
        await ask(ctx, s, {
          from: 'topic',
          where: { title: 'root' },
          steps: [{ relation: 'topic-tree', back: true, all: true }],
          maxDepth: 2
        }),
        ['a', 'b'],
        'two under root'
      );
      expectRows(
        await ask(ctx, s, {
          from: 'topic',
          where: { title: 'root' },
          steps: [{ relation: 'topic-tree', back: true, all: true }],
          maxDepth: 3
        }),
        ['a', 'b', 'c'],
        'three under root'
      );
      expectRows(
        await ask(ctx, s, { from: 'session', where: { title: 's1' }, steps: [{ relation: 'attended' }] }),
        ['ann', 'cy'],
        'who came to s1'
      );
    }
  },
  {
    id: 'world/the-rule-from-the-login',
    area: 'paths',
    pins: "AC3's rule as a sentence: from the login, through the person they signed up as, what a holder sees",
    async run(ctx) {
      const s = await seed(ctx);
      const r = worldRule(
        schema,
        files,
        { collection: 'SignedUp', by: 'doneBy', then: [{ follow: 'person' }] },
        { from: 'person', steps: HOLDER }
      );
      if (!r.ok) throw new Error(r.problem);
      const sees = async (login: string): Promise<string[]> => {
        const where = {
          $path: renamed(s.real, {
            from: { collection: USERS, where: { objectId: s.id[login] } },
            hops: r.rule.path.hops,
            maxDepth: r.rule.path.maxDepth
          })
        };
        const got = await ctx.query(s.real('Person'), { where });
        return got.results.map((x) => String(x.name)).sort();
      };
      expectRows(await sees('u-ann'), ['ann', 'bob', 'eve'], 'the holder of two accounts');
      expectRows(await sees('u-cy'), ['cy'], 'the other holder');
      expectRows(await sees('u-bob'), [], 'a member');
    }
  }
];

type Engine = { name: string; make: () => Promise<IStorageAdapter>; teardown: () => Promise<void>; available: boolean };

function sqlite(): Engine {
  const dirs: string[] = [];
  const handles: PersistenceHandle[] = [];
  return {
    name: 'local-sql (node:sqlite)',
    available: true,
    async make() {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ont004-world-'));
      dirs.push(dir);
      const h = await createAdapter({ dataDir: dir });
      handles.push(h);
      return h.adapter;
    },
    async teardown() {
      for (const h of handles) await h.adapter.disconnect();
      for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
    }
  };
}

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
const DB_NAME = `nodegx_ont004_${process.pid}_${Date.now().toString(36)}`;
function psql(url: string, sql: string): void {
  execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { stdio: 'ignore' });
}
function pgReachable(): boolean {
  try {
    psql(ADMIN_URL, 'SELECT 1');
    return true;
  } catch {
    return false;
  }
}
function postgres(): Engine {
  const dirs: string[] = [];
  const handles: PersistenceHandle[] = [];
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
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ont004-world-pg-'));
      dirs.push(dir);
      const h = await createAdapter({ dataDir: dir, storageUrl: u.toString() });
      handles.push(h);
      return h.adapter;
    },
    async teardown() {
      for (const h of handles) {
        try {
          await h.adapter.disconnect();
        } catch {
          /* best-effort teardown */
        }
      }
      for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
      if (created) {
        try {
          psql(ADMIN_URL, `DROP DATABASE IF EXISTS "${DB_NAME}"`);
        } catch {
          /* a client still attached; the next run uses a new name anyway */
        }
      }
    }
  };
}

const PATH_MUTANTS: MutationKind[] = [
  'path-ignores-the-start-filter',
  'path-ignores-hop-filters',
  'path-ignores-the-depth-bound'
];

for (const engine of [sqlite(), postgres()]) {
  const suite = engine.available ? describe : describe.skip;
  suite(`ONT-004 — the membership world's paths, on ${engine.name}`, () => {
    afterAll(() => engine.teardown());

    it('AC1 — the four census paths and the other link shapes return the right rows', async () => {
      const report: ConformanceReport = await runConformance(engine.make, { adapter: engine.name }, { cases });
      if (report.failures.length)
        throw new Error(`${report.failures.length} path(s) wrong on ${engine.name}:\n${formatFailures(report)}`);
      expect(report.passed).toBe(cases.length);
    });

    it.each(PATH_MUTANTS)('AC1 — %s is caught by the world’s paths', async (kind) => {
      const report = await runConformance(
        async () => mutate(await engine.make(), kind),
        { adapter: `${engine.name} — ${kind}` },
        { cases }
      );
      expect(report.failures.length).toBeGreaterThan(0);
    });
  });
}
