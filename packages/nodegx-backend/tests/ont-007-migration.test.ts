/**
 * P116 ONT-007 — the diff is the migration, graded on records, on two engines.
 *
 * `planMigration()` (`@nodegx/project-contract/world`) turns two worlds into steps; the backend
 * contract's `runMigration()` runs them through the schema surface and the data plane. This file
 * gives both a database with records in it, on SQLite and on PostgreSQL (built by
 * `createAdapter()`, never by class name), and grades:
 *
 *   - **AC1, the bombshell** — "a member belongs to one account" said again as "some members are
 *     on two": every record is still there, every person's account is now their first membership,
 *     and every claim of the new world passes ON THE MIGRATED TABLES (not on fresh ones) — or, if
 *     the plan says a rule is not kept after it, fails at the step that says that rule;
 *   - **the grade grades something** — the same plan with its move taken out, and with its rule
 *     step taken out, each caught (a record check that cannot fail, and a claim run that cannot
 *     fail, would both pass a migration that did nothing);
 *   - **AC2, the mirror refused** — "several accounts become one" on data with a person on two:
 *     refused, the rows that stop it counted, no backup taken, nothing moved;
 *   - **the mirror run** — on data where it fits, only once its losses are accepted;
 *   - **the backup comes first** — on SQLite the backup is the backend's own online snapshot, and
 *     it holds the records as they were before the first step.
 *
 * PostgreSQL is skipped when no server answers, as BRG-005's suites are.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { IStorageAdapter } from '@noodl/backend-contract';
import {
  dryRunMigration,
  makeContext,
  runClaim,
  runMigration,
  saysTheRule,
  type ConformanceContext,
  type MigrationPlanData
} from '@noodl/backend-contract/conformance';

// Relative on purpose, as ONT-003's spec: this package declares no dependency on the project contract.
import { planMigration, schemaPushes, type MigrationPlan, type WorldFiles, type WorldSchema } from '../../nodegx-project-contract/world';
import { snapshotDatabase } from '../src/backup/snapshot';
import { createAdapter, type PersistenceHandle } from '../src/persistence/createAdapter';

jest.setTimeout(300000);

const FIXTURES = path.join(__dirname, '../../nodegx-project-contract/tests/fixtures');
function readWorld(fixture: string): WorldFiles {
  const dir = path.join(FIXTURES, fixture, 'docs/world');
  const read = (name: string) => JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8'));
  return { nouns: read('nouns'), relations: read('relations'), vocabulary: read('vocabulary') };
}
const ONE = readWorld('world-bombshell-before');
const MANY = readWorld('world-bombshell-after');
const PROFILE_KEEPS_IT = readWorld('world-extends-before');
/** "Users are sorted by when their profile was last updated": the field moved onto the user (ONT-005's `filter-field-split-off`, fixed late). */
const USER_KEEPS_IT: WorldFiles = (() => {
  const w: WorldFiles = JSON.parse(JSON.stringify(PROFILE_KEEPS_IT));
  w.nouns.nouns[0].properties!.push({ name: 'updated', kind: 'date', sentence: 'When the profile was last changed.' });
  w.nouns.nouns[1].properties = w.nouns.nouns[1].properties!.filter((p) => p.name !== 'updated');
  return w;
})();

function plan(before: WorldFiles, after: WorldFiles): MigrationPlan {
  const out = planMigration(before, after);
  if (!out.ok) throw new Error(out.problems.join('\n'));
  return out.plan;
}
// The compile-time half: the planner's output IS the runner's input, with no cast.
const asPlanData = (p: MigrationPlan): MigrationPlanData => p;

/** The plan with one step taken out: what the grade must catch. */
function without(p: MigrationPlan, pick: (s: MigrationPlan['steps'][number]) => boolean): MigrationPlan {
  const steps = p.steps.filter((s) => !pick(s));
  if (steps.length !== p.steps.length - 1) throw new Error('the mutant takes out exactly one step');
  return { ...p, steps };
}

// ------------------------------------------------------------------- engines --

type Engine = { name: string; available: boolean; make: () => Promise<PersistenceHandle>; teardown: () => Promise<void> };

function sqlite(): Engine {
  const dirs: string[] = [];
  const handles: PersistenceHandle[] = [];
  return {
    name: 'local-sql (node:sqlite)',
    available: true,
    async make() {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ont007-'));
      dirs.push(dir);
      const h = await createAdapter({ dataDir: dir });
      handles.push(h);
      return h;
    },
    async teardown() {
      for (const h of handles) await h.adapter.disconnect();
      for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
    }
  };
}

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
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
  const dbs: string[] = [];
  return {
    name: 'postgres',
    available: pgReachable(),
    async make() {
      // A database per run: a migration renames nothing, so two runs would share their tables.
      const db = `nodegx_ont007_${process.pid}_${Date.now().toString(36)}_${dbs.length}`;
      psql(ADMIN_URL, `CREATE DATABASE "${db}"`);
      dbs.push(db);
      const u = new URL(ADMIN_URL);
      u.pathname = `/${db}`;
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ont007-pg-'));
      dirs.push(dir);
      const h = await createAdapter({ dataDir: dir, storageUrl: u.toString() });
      handles.push(h);
      return h;
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
      for (const db of dbs) {
        try {
          psql(ADMIN_URL, `DROP DATABASE IF EXISTS "${db}"`);
        } catch {
          /* a client still attached; the name is not reused */
        }
      }
    }
  };
}

// ------------------------------------------------------------------- helpers --

/** The context on the real table names: a migration and its grade read the tables the person has. */
function onTheRealTables(adapter: IStorageAdapter): ConformanceContext {
  const ctx = makeContext(adapter, 'ont007');
  return { ...ctx, collection: (base: string) => base };
}

/** The world's schema, written as the backend's schema route would write it. */
function applyWorld(ctx: ConformanceContext, schema: WorldSchema): void {
  for (const push of schemaPushes(schema)) {
    ctx.schema.createTable({ name: push.table, columns: push.columns, description: push.description });
    if (push.checks.length) ctx.schema.reconcileChecks!(push.table, push.checks);
    if (push.indexes.length) ctx.schema.reconcileIndexes!(push.table, push.indexes);
  }
}

const pointer = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
const idOf = (v: unknown): string | undefined => (v && typeof v === 'object' && 'objectId' in v ? String((v as { objectId: unknown }).objectId) : typeof v === 'string' ? v : undefined);

/** Every row of a collection, by the id order a migration reads them in. */
async function rows(ctx: ConformanceContext, collection: string): Promise<Array<Record<string, unknown>>> {
  return (await ctx.query(collection, { sort: ['objectId'], limit: 1000 })).results;
}

/** Three people on one account each — two on Northwind, one on Contoso. */
async function seedOne(ctx: ConformanceContext): Promise<{ accounts: Record<string, string>; people: Record<string, string>; on: Record<string, string> }> {
  const accounts: Record<string, string> = {};
  for (const name of ['Northwind', 'Contoso']) accounts[name] = String((await ctx.create('Account', { name })).objectId);
  const people: Record<string, string> = {};
  const on: Record<string, string> = { Ada: 'Northwind', Grace: 'Northwind', Linus: 'Contoso' };
  for (const [name, account] of Object.entries(on)) people[name] = String((await ctx.create('Person', { name, account: pointer('Account', accounts[account]) })).objectId);
  return { accounts, people, on };
}

/**
 * The new world's claims on the migrated tables, applying nothing (`apply: false`: applying
 * would declare the rules a migration forgot — measured, §6.3). A held claim must pass, a claim labelled not
 * held must fail at the step that says its rule, and so must every claim the plan said the
 * records will not keep after it. Returns what did otherwise, in words — empty when graded.
 */
async function claimsOnTheMigratedTables(ctx: ConformanceContext, p: MigrationPlan): Promise<string[]> {
  const notKept = new Set(p.notKept.map((n) => n.claim));
  const wrong: string[] = [];
  for (const claim of p.after.claims) {
    const run = await runClaim(ctx, p.after, claim, { apply: false });
    const shouldPass = claim.held && !notKept.has(claim.id);
    if (shouldPass && run.at >= 0) wrong.push(`${claim.id} is not kept: step ${run.at} — ${run.message}`);
    if (!shouldPass && (run.at < 0 || !saysTheRule(claim.steps[run.at])))
      wrong.push(`${claim.id} was expected to fail at its rule, and ${run.at < 0 ? 'passed' : `failed making rows at step ${run.at}: ${run.message}`}`);
  }
  return wrong;
}

// --------------------------------------------------------------------- suites --

for (const engine of [sqlite(), postgres()]) {
  const suite = engine.available ? describe : describe.skip;
  suite(`ONT-007 — the migration, on ${engine.name}`, () => {
    afterAll(() => engine.teardown());

    const bombshell = plan(ONE, MANY);
    const mirror = plan(MANY, ONE);

    /** One account → several, on a fresh database: the run, the records after, and the claims after. */
    async function migrateTheBombshell(p: MigrationPlan) {
      const h = await engine.make();
      const ctx = onTheRealTables(h.adapter);
      applyWorld(ctx, bombshell.before);
      const seeded = await seedOne(ctx);
      const order: string[] = [];
      const run = await runMigration(ctx, asPlanData(p), {
        backup: async () => {
          order.push('backup');
          if (!h.dbPath) return 'not a file engine: the backend’s backup route is owed (ONT-007 §6)';
          const out = path.join(path.dirname(h.dbPath), 'before-migration.db');
          await snapshotDatabase(h.dbPath, out);
          return out;
        }
      });
      const after = {
        people: (await rows(ctx, 'Person')).length,
        accounts: (await rows(ctx, 'Account')).length,
        memberships: ctx.schema.listTables().includes('Membership') ? await rows(ctx, 'Membership') : []
      };
      return { h, ctx, seeded, run, order, after };
    }

    /** Who is on which account, read back from the membership records, by the people's names. */
    function onFromMemberships(seeded: Awaited<ReturnType<typeof seedOne>>, memberships: Array<Record<string, unknown>>): Record<string, string> {
      const nameOfPerson = Object.fromEntries(Object.entries(seeded.people).map(([n, id]) => [id, n]));
      const nameOfAccount = Object.fromEntries(Object.entries(seeded.accounts).map(([n, id]) => [id, n]));
      return Object.fromEntries(memberships.map((m) => [nameOfPerson[idOf(m.person)!], nameOfAccount[idOf(m.account)!]]));
    }

    describe('AC1 — the bombshell: one account becomes several', () => {
      let result: Awaited<ReturnType<typeof migrateTheBombshell>>;
      beforeAll(async () => {
        result = await migrateTheBombshell(bombshell);
      });

      it('runs every step, after the backup, with nothing to refuse and nothing lost', () => {
        expect(result.run).toMatchObject({ ran: true, steps: bombshell.steps.length });
        expect(result.run.dryRun).toEqual({ refusals: [], losses: [], moves: [{ says: expect.stringMatching(/^every person's account becomes/), rows: 3 }] });
        expect(result.order).toEqual(['backup']);
      });

      it('keeps every record, and every person’s account is now their first membership', () => {
        expect({ people: result.after.people, accounts: result.after.accounts, memberships: result.after.memberships.length }).toEqual({ people: 3, accounts: 2, memberships: 3 });
        expect(onFromMemberships(result.seeded, result.after.memberships)).toEqual(result.seeded.on);
        expect(result.ctx.schema.getTableSchema('Person')!.columns!.map((c) => c.name)).not.toContain('account');
      });

      it('keeps every claim of the new world on the migrated tables', async () => {
        expect(await claimsOnTheMigratedTables(result.ctx, bombshell)).toEqual([]);
      });

      if (engine.name.startsWith('local-sql'))
        it('took the backup before the first step: the snapshot still has every person’s account', () => {
          const snap = String((result.run as { backup: unknown }).backup);
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { DatabaseSync } = require('node:sqlite');
          const db = new DatabaseSync(snap, { readOnly: true });
          const cols = (db.prepare(`PRAGMA table_info("Person")`).all() as Array<{ name: string }>).map((c) => c.name);
          const kept = db.prepare(`SELECT COUNT(*) AS n FROM "Person" WHERE "account" IS NOT NULL`).get() as { n: number };
          db.close();
          expect(cols).toContain('account');
          expect(kept.n).toBe(3);
        });
    });

    describe('the grade grades something', () => {
      it('the plan without its move leaves the memberships empty, and the record check says so', async () => {
        const r = await migrateTheBombshell(without(bombshell, (s) => 'move' in s));
        expect(r.run.ran).toBe(true);
        expect(r.after.memberships.length).toBe(0);
        expect(onFromMemberships(r.seeded, r.after.memberships)).not.toEqual(r.seeded.on);
      });

      it('the plan without its rule step leaves a role off its list, and a claim says so', async () => {
        const r = await migrateTheBombshell(without(bombshell, (s) => 'schema' in s && s.schema.action === 'setChecks'));
        expect(r.run.ran).toBe(true);
        expect(await claimsOnTheMigratedTables(r.ctx, bombshell)).toEqual([expect.stringMatching(/^membership\/role-is-one-of-its-list is not kept/)]);
      });
    });

    describe('filter-field-split-off, fixed late: the field moves from the profile to the user, value by value', () => {
      const moved = plan(PROFILE_KEEPS_IT, USER_KEEPS_IT);
      async function migrate(p: MigrationPlan) {
        const h = await engine.make();
        const ctx = onTheRealTables(h.adapter);
        applyWorld(ctx, moved.before);
        const want: Record<string, string> = {};
        for (const [name, day] of [
          ['Ada', '2026-03-01'],
          ['Grace', '2026-05-17']
        ]) {
          const u = String((await ctx.create('User', { name })).objectId);
          await ctx.create('Profile', { user: pointer('User', u), bio: `${name} writes`, updated: { __type: 'Date', iso: `${day}T00:00:00.000Z` } });
          want[name] = day;
        }
        await ctx.create('User', { name: 'Linus' }); // no profile: no date to carry
        const run = await runMigration(ctx, asPlanData(p), { backup: async () => 'taken' });
        const days = Object.fromEntries(
          (await rows(ctx, 'User')).map((u) => {
            const v = u.updated as { iso?: string } | string | undefined;
            const iso = typeof v === 'string' ? v : v?.iso;
            return [u.name, iso ? new Date(iso).toISOString().slice(0, 10) : null];
          })
        );
        return { ctx, run, days, want };
      }

      it('every user holds their profile’s date; the user without a profile holds none; the profile no longer has it', async () => {
        const r = await migrate(moved);
        expect(r.run).toMatchObject({ ran: true });
        expect(r.days).toEqual({ ...r.want, Linus: null });
        expect(r.ctx.schema.getTableSchema('Profile')!.columns!.map((c) => c.name)).not.toContain('updated');
        expect(await claimsOnTheMigratedTables(r.ctx, moved)).toEqual([]);
      });

      it('the plan without the move would drop the dates — and the grade sees it', async () => {
        const r = await migrate(without(moved, (s) => 'move' in s));
        expect(r.run).toMatchObject({ ran: true });
        expect(r.days).toEqual({ Ada: null, Grace: null, Linus: null });
      });
    });

    describe('AC2 — the mirror, on data it cannot keep', () => {
      it('a person on two accounts stops it: the rows counted, no backup taken, nothing moved', async () => {
        const h = await engine.make();
        const ctx = onTheRealTables(h.adapter);
        applyWorld(ctx, mirror.before);
        const acct = { a: String((await ctx.create('Account', { name: 'Northwind' })).objectId), b: String((await ctx.create('Account', { name: 'Contoso' })).objectId) };
        const ada = String((await ctx.create('Person', { name: 'Ada' })).objectId);
        const linus = String((await ctx.create('Person', { name: 'Linus' })).objectId);
        for (const [p, a] of [
          [ada, acct.a],
          [ada, acct.b],
          [linus, acct.b]
        ])
          await ctx.create('Membership', { person: pointer('Person', p), account: pointer('Account', a), role: 'member' });

        let backups = 0;
        const run = await runMigration(ctx, asPlanData(mirror), { backup: async () => ++backups, acceptLosses: true });
        expect(run.ran).toBe(false);
        expect(run.dryRun.refusals).toEqual([{ says: 'a person on more than one account cannot keep just one without losing the others', rows: 1 }]);
        expect(backups).toBe(0);
        expect((await rows(ctx, 'Membership')).length).toBe(3);
        expect(ctx.schema.getTableSchema('Person')!.columns!.map((c) => c.name)).not.toContain('account');
      });

      it('a person on no account stops it too, because every person must have one', async () => {
        const h = await engine.make();
        const ctx = onTheRealTables(h.adapter);
        applyWorld(ctx, mirror.before);
        const a = String((await ctx.create('Account', { name: 'Northwind' })).objectId);
        const ada = String((await ctx.create('Person', { name: 'Ada' })).objectId);
        await ctx.create('Person', { name: 'Grace' });
        await ctx.create('Membership', { person: pointer('Person', ada), account: pointer('Account', a) });
        const dry = await dryRunMigration(ctx, asPlanData(mirror));
        expect(dry.refusals).toEqual([{ says: 'every person must have an account, and some are on none', rows: 1 }]);
      });
    });

    describe('the mirror, on data it can keep', () => {
      let ctx: ConformanceContext;
      let first: Awaited<ReturnType<typeof runMigration>>;
      let second: Awaited<ReturnType<typeof runMigration>>;
      const want: Record<string, string> = {};
      beforeAll(async () => {
        const h = await engine.make();
        ctx = onTheRealTables(h.adapter);
        applyWorld(ctx, mirror.before);
        const accounts = { Northwind: String((await ctx.create('Account', { name: 'Northwind' })).objectId), Contoso: String((await ctx.create('Account', { name: 'Contoso' })).objectId) };
        for (const [name, account, role] of [
          ['Ada', 'Northwind', 'holder'],
          ['Linus', 'Contoso', 'member']
        ]) {
          const p = String((await ctx.create('Person', { name })).objectId);
          await ctx.create('Membership', { person: pointer('Person', p), account: pointer('Account', accounts[account as 'Northwind']), role });
          want[name] = accounts[account as 'Northwind'];
        }
        first = await runMigration(ctx, asPlanData(mirror), { backup: async () => 'taken' });
        second = await runMigration(ctx, asPlanData(mirror), { backup: async () => 'taken', acceptLosses: true });
      });

      it('waits for the losses to be accepted, counted in words', () => {
        expect(first).toMatchObject({ ran: false, why: "it would lose the role of each 'membership' record (2), and that was not accepted" });
      });

      it('then gives every person their one account, and the membership records go', async () => {
        expect(second).toMatchObject({ ran: true });
        const people = await rows(ctx, 'Person');
        expect(Object.fromEntries(people.map((p) => [p.name, idOf(p.account)]))).toEqual(want);
        expect(ctx.schema.listTables()).not.toContain('Membership');
      });

      it('keeps every claim of the old world but the one it said it would not', async () => {
        expect(mirror.notKept.map((n) => n.claim)).toEqual(['person/account-is-required']);
        expect(await claimsOnTheMigratedTables(ctx, mirror)).toEqual([]);
      });
    });
  });
}
