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
 *     it holds the records as they were before the first step;
 *   - **AC3, a noun renamed** — "accounts are subscriptions now" (`was`): every record kept under the
 *     new name, every link to them read back as a link to the new name, the field named after it
 *     renamed, the rule built under the old name taken off and put back, the new world's claims
 *     green on the migrated tables, and a backend opened again on the same database sees it all
 *     (the DDL ran, not only the model); each step's mutant caught; and `renameTable` itself —
 *     junction tables carried, refused while a rule is built under the name.
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
import { AdapterFacade } from '../src/persistence/AdapterFacade';
import { createAdapter, type PersistenceHandle } from '../src/persistence/createAdapter';
import { deletesThroughTheFacade } from './helpers/facade-deletes';

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
/** The world with one noun called something else: a new id, a new word, and the id it `was`. */
function renamed(w: WorldFiles, from: string, to: string, name: string): WorldFiles {
  const out: WorldFiles = JSON.parse(JSON.stringify(w));
  Object.assign(out.nouns.nouns.find((n) => n.id === from)!, { id: to, name, was: from });
  for (const r of out.relations.relations) {
    if (r.from === from) r.from = to;
    if (r.to === from) r.to = to;
  }
  return out;
}
/** Accounts with a tier from a fixed list: a rule built under the collection's name. */
const TIERED: WorldFiles = (() => {
  const w: WorldFiles = JSON.parse(JSON.stringify(ONE));
  w.nouns.nouns[1].properties!.push({ name: 'tier', kind: 'choice', values: ['basic', 'gold'] });
  return w;
})();
const SUBSCRIBED = renamed(TIERED, 'account', 'subscription', 'Subscription');

// The compile-time half: the planner's output IS the runner's input, with no cast.
const asPlanData = (p: MigrationPlan): MigrationPlanData => p;

/** The plan with one step taken out: what the grade must catch. */
function without(p: MigrationPlan, pick: (s: MigrationPlan['steps'][number]) => boolean): MigrationPlan {
  const steps = p.steps.filter((s) => !pick(s));
  if (steps.length !== p.steps.length - 1) throw new Error('the mutant takes out exactly one step');
  return { ...p, steps };
}

// ------------------------------------------------------------------- engines --

type Engine = {
  name: string;
  available: boolean;
  make: () => Promise<PersistenceHandle>;
  /** A second backend on the same database, as a restart would open it. */
  reopen: (h: PersistenceHandle) => Promise<PersistenceHandle>;
  teardown: () => Promise<void>;
};

function sqlite(): Engine {
  const dirs: string[] = [];
  const handles: PersistenceHandle[] = [];
  const opened = new Map<PersistenceHandle, string>();
  return {
    name: 'local-sql (node:sqlite)',
    available: true,
    async make() {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ont007-'));
      dirs.push(dir);
      const h = await createAdapter({ dataDir: dir });
      handles.push(h);
      opened.set(h, dir);
      return h;
    },
    async reopen(h) {
      const again = await createAdapter({ dataDir: opened.get(h)! });
      handles.push(again);
      return again;
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
  const opened = new Map<PersistenceHandle, { dataDir: string; storageUrl: string }>();
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
      opened.set(h, { dataDir: dir, storageUrl: u.toString() });
      return h;
    },
    async reopen(h) {
      const again = await createAdapter(opened.get(h)!);
      handles.push(again);
      return again;
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
  // R10: the backend's own delete, which keeps every link's "when it goes" rule.
  const ctx = makeContext(deletesThroughTheFacade(adapter), 'ont007');
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

    describe('AC3 — a noun renamed: accounts are subscriptions now, every record kept', () => {
      const rename = plan(TIERED, SUBSCRIBED);

      async function migrateTheRename(p: MigrationPlan) {
        const h = await engine.make();
        const ctx = onTheRealTables(h.adapter);
        applyWorld(ctx, rename.before);
        const accounts: Record<string, string> = {};
        for (const [name, tier] of [
          ['Northwind', 'gold'],
          ['Contoso', 'basic']
        ])
          accounts[name] = String((await ctx.create('Account', { name, tier })).objectId);
        const on: Record<string, string> = { Ada: 'Northwind', Grace: 'Northwind', Linus: 'Contoso' };
        for (const [name, account] of Object.entries(on)) await ctx.create('Person', { name, account: pointer('Account', accounts[account]) });
        const run = await runMigration(ctx, asPlanData(p), { backup: async () => 'taken' });
        return { h, ctx, run, accounts, on };
      }
      /** Who holds which subscription, by name, read through the field the new world names. */
      async function holders(ctx: ConformanceContext, accounts: Record<string, string>): Promise<Record<string, string | undefined>> {
        const nameOf = Object.fromEntries(Object.entries(accounts).map(([n, id]) => [id, n]));
        return Object.fromEntries((await rows(ctx, 'Person')).map((p) => [p.name, nameOf[idOf(p.subscription) || '']]));
      }

      let result: Awaited<ReturnType<typeof migrateTheRename>>;
      beforeAll(async () => {
        result = await migrateTheRename(rename);
      });

      it('runs every step, nothing to refuse and nothing lost', () => {
        expect(result.run).toMatchObject({ ran: true, steps: rename.steps.length });
        expect(result.run.dryRun).toEqual({ refusals: [], losses: [], moves: [] });
      });

      it('keeps every account as a subscription, with the same id, and every person on the one they were on', async () => {
        const subs = await rows(result.ctx, 'Subscription');
        expect(Object.fromEntries(subs.map((s) => [s.name, [String(s.objectId), s.tier]]))).toEqual({
          Northwind: [result.accounts.Northwind, 'gold'],
          Contoso: [result.accounts.Contoso, 'basic']
        });
        expect(result.ctx.schema.listTables()).not.toContain('Account');
        expect(await holders(result.ctx, result.accounts)).toEqual(result.on);
      });

      it('every link to them goes with them: on the wire a person’s subscription is a link to Subscription, and include follows it', async () => {
        const col = result.ctx.schema.getTableSchema('Person')!.columns!.find((c) => c.name === 'subscription');
        expect(col).toMatchObject({ type: 'Pointer', targetClass: 'Subscription' });
        // The adapter hands a link back as a bare id; the wire (`AdapterFacade.toWire`) is what reads
        // the column's target, so it is the reader a stale target would mislead.
        const wire = new AdapterFacade(result.h.adapter);
        const { results } = await wire.wireQuery('Person', { where: { name: 'Ada' }, include: ['subscription'] });
        expect(results[0].subscription).toMatchObject({ __type: 'Object', className: 'Subscription', objectId: result.accounts.Northwind, name: 'Northwind', tier: 'gold' });
      });

      it('keeps every claim of the new world on the migrated tables — the list put back is enforced', async () => {
        expect(await claimsOnTheMigratedTables(result.ctx, rename)).toEqual([]);
      });

      it('a backend opened again on the same database sees the rename: the DDL ran, not only the model', async () => {
        await rows(result.ctx, 'Person'); // a data call waits for every queued statement
        const again = onTheRealTables((await engine.reopen(result.h)).adapter);
        expect(again.schema.listTables()).toEqual(expect.arrayContaining(['Person', 'Subscription']));
        expect(again.schema.listTables()).not.toContain('Account');
        expect(again.schema.getTableSchema('Person')!.columns!.find((c) => c.name === 'subscription')).toMatchObject({ targetClass: 'Subscription' });
        expect((again.schema.checkStatus!('Subscription') || []).map((c) => [c.built, c.declared])).toEqual([[true, true]]);
        expect(await holders(again, result.accounts)).toEqual(result.on);
      });

      it('the plan without its field rename leaves every person holding nothing under the new name — and the grade sees it', async () => {
        const r = await migrateTheRename(without(rename, (s) => 'schema' in s && s.schema.action === 'renameColumn'));
        expect(r.run).toMatchObject({ ran: true });
        expect(await holders(r.ctx, r.accounts)).toEqual({ Ada: undefined, Grace: undefined, Linus: undefined });
      });

      it('the plan without putting the list back renames everything — and a claim sees the list is gone', async () => {
        const r = await migrateTheRename(without(rename, (s) => 'schema' in s && s.schema.action === 'setChecks' && s.schema.checks.length > 0));
        expect(r.run).toMatchObject({ ran: true });
        expect(await claimsOnTheMigratedTables(r.ctx, rename)).toEqual([expect.stringMatching(/^subscription\/tier-is-one-of-its-list is not kept/)]);
      });

      it('the plan without taking the list off first is refused at the rename, and nothing is renamed', async () => {
        const r = await migrateTheRename(without(rename, (s) => 'schema' in s && s.schema.action === 'setChecks' && s.schema.checks.length === 0));
        expect(r.run).toMatchObject({ ran: 'partly', steps: 1, failed: { step: 1, message: expect.stringMatching(/the rule chk_Account_\w+ is built under its name/) } });
        expect(r.ctx.schema.listTables()).toEqual(expect.arrayContaining(['Account', 'Person']));
        expect((await rows(r.ctx, 'Account')).length).toBe(2);
      });
    });

    describe('renameTable itself — what it carries, and what refuses it', () => {
      it('carries the junction tables the collection owns, and every other collection’s link to it', async () => {
        const h = await engine.make();
        const ctx = onTheRealTables(h.adapter);
        ctx.schema.createTable({ name: 'Book', columns: [{ name: 'title', type: 'String' }] });
        ctx.schema.createTable({ name: 'Shelf', columns: [{ name: 'label', type: 'String' }, { name: 'books', type: 'Relation', targetClass: 'Book' }] });
        ctx.schema.createTable({ name: 'Room', columns: [{ name: 'shelf', type: 'Pointer', targetClass: 'Shelf' }] });
        const book = String((await ctx.create('Book', { title: 'Dune' })).objectId);
        const shelf = String((await ctx.create('Shelf', { label: 'top' })).objectId);
        ctx.schema.addRelation('Shelf', shelf, 'books', book);
        await rows(ctx, 'Book');
        expect(ctx.schema.renameTable!('Shelf', 'Bookcase')).toBe(true);
        expect(ctx.schema.getRelatedIds('Bookcase', shelf, 'books')).toEqual([book]);
        expect(ctx.schema.getTableSchema('Room')!.columns!.find((c) => c.name === 'shelf')).toMatchObject({ targetClass: 'Bookcase' });
        expect((await rows(ctx, 'Bookcase')).map((r) => r.label)).toEqual(['top']);
        const again = onTheRealTables((await engine.reopen(h)).adapter);
        expect(again.schema.getRelatedIds('Bookcase', shelf, 'books')).toEqual([book]);
        expect(again.schema.getTableSchema('Room')!.columns!.find((c) => c.name === 'shelf')).toMatchObject({ targetClass: 'Bookcase' });
      });

      it('the adapter follows a renamed link at once — the collection and the field — after a read before the rename', async () => {
        // s11, found by the route's spec: the adapter's declared types are memoised against the schema object, and
        // PostgreSQL renamed the column (and retargeted the links) IN that object — a `$path` through the renamed
        // link was refused as "not a declared link (it is String)" until a restart. `getTableSchema` read fine.
        const h = await engine.make();
        const ctx = onTheRealTables(h.adapter);
        ctx.schema.createTable({ name: 'Account', columns: [{ name: 'name', type: 'String' }] });
        ctx.schema.createTable({ name: 'Person', columns: [{ name: 'name', type: 'String' }, { name: 'account', type: 'Pointer', targetClass: 'Account' }] });
        const north = String((await ctx.create('Account', { name: 'Northwind' })).objectId);
        const ada = String((await ctx.create('Person', { name: 'Ada', account: pointer('Account', north) })).objectId);
        const accountOf = (collection: string, field: string) =>
          ctx.query(collection, { where: { $path: { from: { collection: 'Person', where: { objectId: ada } }, hops: [{ follow: field }], maxDepth: 1 } } });
        expect((await accountOf('Account', 'account')).results.map((r) => r.name)).toEqual(['Northwind']);
        ctx.schema.renameTable!('Account', 'Subscription');
        await (ctx.schema as { barrier?: () => Promise<void> }).barrier?.call(ctx.schema);
        // A read between the two renames: the field rename must not leave the memo of THIS read answering.
        expect((await accountOf('Subscription', 'account')).results.map((r) => r.name)).toEqual(['Northwind']);
        ctx.schema.renameColumn('Person', 'account', 'subscription');
        await (ctx.schema as { barrier?: () => Promise<void> }).barrier?.call(ctx.schema);
        expect((await accountOf('Subscription', 'subscription')).results.map((r) => r.name)).toEqual(['Northwind']);
      });

      it('a collection that links to itself is renamed with its link: a topic’s parent is a subject’s parent', async () => {
        const h = await engine.make();
        const ctx = onTheRealTables(h.adapter);
        ctx.schema.createTable({ name: 'Topic', columns: [{ name: 'title', type: 'String' }, { name: 'parent', type: 'Pointer', targetClass: 'Topic' }] });
        const root = String((await ctx.create('Topic', { title: 'root' })).objectId);
        await ctx.create('Topic', { title: 'leaf', parent: pointer('Topic', root) });
        await rows(ctx, 'Topic');
        ctx.schema.renameTable!('Topic', 'Subject');
        await (ctx.schema as { barrier?: () => Promise<void> }).barrier?.call(ctx.schema);
        expect(ctx.schema.getTableSchema('Subject')!.columns!.find((c) => c.name === 'parent')).toMatchObject({ targetClass: 'Subject' });
        expect(ctx.schema.getTableSchema('Topic')).toBeFalsy();
        const again = onTheRealTables((await engine.reopen(h)).adapter);
        expect(again.schema.getTableSchema('Subject')!.columns!.find((c) => c.name === 'parent')).toMatchObject({ targetClass: 'Subject' });
        expect(again.schema.getTableSchema('Topic')).toBeFalsy();
      });

      it('refuses a name taken, a name unknown, and the backend’s own collections — in words', async () => {
        const h = await engine.make();
        const ctx = onTheRealTables(h.adapter);
        ctx.schema.createTable({ name: 'A', columns: [] });
        ctx.schema.createTable({ name: 'B', columns: [] });
        expect(() => ctx.schema.renameTable!('A', 'B')).toThrow('There is already a collection called "B"');
        expect(() => ctx.schema.renameTable!('Nope', 'C')).toThrow('There is no collection called "Nope"');
        expect(() => ctx.schema.renameTable!('_User', 'People')).toThrow('"_User" is one of the backend\'s own collections');
        expect(() => ctx.schema.renameTable!('A', 'not a name')).toThrow('"not a name" cannot be a collection\'s name');
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

      it('keeps every claim of the old world — the link made required once the move has filled it (P116-ONT-007-required)', async () => {
        // Until setRequired the plan named `person/account-is-required` in `notKept`, and it was measured to fail here.
        expect(mirror.notKept).toEqual([]);
        expect(await claimsOnTheMigratedTables(ctx, mirror)).toEqual([]);
      });
    });

    describe('P116-ONT-007-required — the link made required after the move, and the grade that catches a plan without it', () => {
      async function migrated(p: MigrationPlan) {
        const h = await engine.make();
        const ctx = onTheRealTables(h.adapter);
        applyWorld(ctx, mirror.before);
        const a = String((await ctx.create('Account', { name: 'Northwind' })).objectId);
        for (const name of ['Ada', 'Linus']) {
          const person = String((await ctx.create('Person', { name })).objectId);
          await ctx.create('Membership', { person: pointer('Person', person), account: pointer('Account', a) });
        }
        return { ctx, run: await runMigration(ctx, asPlanData(p), { backup: async () => 'taken', acceptLosses: true }) };
      }

      it('a person made without an account is refused after the run', async () => {
        const { ctx, run } = await migrated(mirror);
        expect(run).toMatchObject({ ran: true });
        await ctx.refused(() => ctx.create('Person', { name: 'Grace' }));
      });

      it('the mutant: without its setRequired step the run still "works", and the grade names the claim it left unkept', async () => {
        const { ctx, run } = await migrated(without(mirror, (s) => 'schema' in s && s.schema.action === 'setRequired'));
        expect(run).toMatchObject({ ran: true });
        expect((await claimsOnTheMigratedTables(ctx, mirror)).map((w) => w.split(' ')[0])).toEqual(['person/account-is-required']);
      });
    });

    describe('P116-ONT-007-required — a link made required in place', () => {
      const LOOSE: WorldFiles = (() => {
        const w: WorldFiles = JSON.parse(JSON.stringify(ONE));
        w.relations.relations[0].answers!.required = false;
        return w;
      })();
      const tighten = plan(LOOSE, ONE);
      const required = (ctx: ConformanceContext) => (ctx.schema.getTableSchema('Person')!.columns!.find((c) => c.name === 'account') as { required?: boolean }).required;

      async function seeded() {
        const h = await engine.make();
        const ctx = onTheRealTables(h.adapter);
        applyWorld(ctx, tighten.before);
        const a = String((await ctx.create('Account', { name: 'Northwind' })).objectId);
        await ctx.create('Person', { name: 'Ada', account: pointer('Account', a) });
        const grace = String((await ctx.create('Person', { name: 'Grace' })).objectId);
        return { ctx, a, grace };
      }

      it('is stopped by the dry run while a person has none — no backup, nothing changed — and runs once each has one', async () => {
        const { ctx, a, grace } = await seeded();
        let backups = 0;
        const refused = await runMigration(ctx, asPlanData(tighten), { backup: async () => ++backups });
        expect(refused).toMatchObject({ ran: false });
        expect(refused.dryRun.refusals).toEqual([{ says: 'every person must have an account now, and some have none', rows: 1 }]);
        expect(backups).toBe(0);
        expect(required(ctx)).toBeFalsy();

        await ctx.save('Person', grace, { account: pointer('Account', a) });
        expect(await runMigration(ctx, asPlanData(tighten), { backup: async () => ++backups })).toMatchObject({ ran: true });
        expect(required(ctx)).toBe(true);
        expect(await claimsOnTheMigratedTables(ctx, tighten)).toEqual([]);
        await ctx.refused(() => ctx.create('Person', { name: 'Linus' }));
      });

      it('the mutant: without its dry-run check the store refuses at the step, after the backup, in words', async () => {
        const { ctx } = await seeded();
        let backups = 0;
        const run = await runMigration(ctx, asPlanData({ ...tighten, checks: [] }), { backup: async () => ++backups });
        expect(backups).toBe(1);
        expect(run).toMatchObject({ ran: 'partly', failed: { step: 1 } });
        expect((run as { failed: { message: string } }).failed.message).toMatch(/Cannot make "account" required on "Person": 1 record has none/);
        expect(required(ctx)).toBeFalsy();
      });
    });

    // ------------------------------------------------------------ s9: the reach review (Fable 5.1) --
    // "What survives is where the error hides": a rule put on records that already break it. Before s9 the
    // dry run read nothing for it; the route refused the rule (HLT-016, FED-002) at its step — AFTER the backup
    // and every step before it — and the run came back `partly`. The mutant plan below (the check taken out)
    // is that measurement, kept.

    describe('s9 — a list narrowed over accounts that hold a value outside it', () => {
      const NARROW: WorldFiles = (() => {
        const w: WorldFiles = JSON.parse(JSON.stringify(TIERED));
        w.nouns.nouns[1].properties!.find((p) => p.name === 'tier')!.values = ['basic'];
        return w;
      })();
      const narrowing = plan(TIERED, NARROW);
      let ctx: ConformanceContext;
      let refused: Awaited<ReturnType<typeof runMigration>>;
      let unread: Awaited<ReturnType<typeof runMigration>>;
      const order: string[] = [];
      beforeAll(async () => {
        const h = await engine.make();
        ctx = onTheRealTables(h.adapter);
        applyWorld(ctx, narrowing.before);
        await ctx.create('Account', { name: 'Northwind', tier: 'gold' });
        await ctx.create('Account', { name: 'Contoso', tier: 'basic' });
        refused = await runMigration(ctx, asPlanData(narrowing), { backup: async () => (order.push('backup'), 'taken') });
        const withoutTheCheck: MigrationPlan = { ...narrowing, checks: narrowing.checks.filter((c) => !('refuse' in c && c.refuse === 'outside-list')) };
        unread = await runMigration(ctx, asPlanData(withoutTheCheck), { backup: async () => (order.push('backup'), 'taken') });
      });

      it('is refused at the dry run with the row counted, and no backup is taken', () => {
        expect(narrowing.checks.map((c) => ('refuse' in c ? c.refuse : c.loses))).toEqual(['outside-list']);
        expect(refused).toMatchObject({ ran: false, why: 'an account whose tier is not one of basic cannot keep it (1)' });
        expect(refused.dryRun.refusals).toEqual([{ says: 'an account whose tier is not one of basic cannot keep it', rows: 1 }]);
      });

      it('the mutant — the plan without that check — takes the backup and then stops part way at the rule step (what s9 measured)', () => {
        // `steps: 1` — the backup step ran; the rule step is the one that failed. On PostgreSQL this needed the
        // executor to await the schema manager's barrier (migration.ts): before s9 the mutant came back `ran: true` there.
        expect(unread).toMatchObject({ ran: 'partly', steps: 1, failed: { step: 1, says: 'accounts keep the lists said now' } });
        expect(order).toEqual(['backup']);
        expect(String((unread as { failed: { message: string } }).failed.message)).toMatch(/break|outside|violat|CHECK/i);
      });
    });

    describe('s9 — a unique rule said over memberships that share a person', () => {
      const ONE_AT_A_TIME: WorldFiles = (() => {
        const w: WorldFiles = JSON.parse(JSON.stringify(MANY));
        w.relations.relations[0].answers!.several = false;
        return w;
      })();
      const tightening = plan(MANY, ONE_AT_A_TIME);
      let refused: Awaited<ReturnType<typeof runMigration>>;
      let unread: Awaited<ReturnType<typeof runMigration>>;
      beforeAll(async () => {
        const h = await engine.make();
        const ctx = onTheRealTables(h.adapter);
        applyWorld(ctx, tightening.before);
        const a = String((await ctx.create('Account', { name: 'Northwind' })).objectId);
        const b = String((await ctx.create('Account', { name: 'Contoso' })).objectId);
        const ada = String((await ctx.create('Person', { name: 'Ada' })).objectId);
        const linus = String((await ctx.create('Person', { name: 'Linus' })).objectId);
        await ctx.create('Membership', { person: pointer('Person', ada), account: pointer('Account', a), role: 'holder' });
        await ctx.create('Membership', { person: pointer('Person', ada), account: pointer('Account', b), role: 'member' });
        await ctx.create('Membership', { person: pointer('Person', linus), account: pointer('Account', b), role: 'member' });
        refused = await runMigration(ctx, asPlanData(tightening), { backup: async () => 'taken' });
        const withoutTheCheck: MigrationPlan = { ...tightening, checks: tightening.checks.filter((c) => !('refuse' in c && c.refuse === 'duplicates')) };
        unread = await runMigration(ctx, asPlanData(withoutTheCheck), { backup: async () => 'taken' });
      });

      it('is refused at the dry run with the rows that share a person counted — Ada\'s two — and nothing moves', () => {
        expect(tightening.checks.map((c) => ('refuse' in c ? c.refuse : c.loses))).toEqual(['duplicates']);
        expect(refused).toMatchObject({ ran: false });
        expect(refused.dryRun.refusals).toEqual([{ says: "two 'membership' records that share person cannot both keep it", rows: 2 }]);
      });

      it('the mutant stops part way at the rule step, after the backup', () => {
        expect(unread).toMatchObject({ ran: 'partly', steps: 1, failed: { step: 1 } });
      });
    });

    describe('s9 — a changed answer that changes only the words on a collection', () => {
      // A noun's sentence, a field's words, and the rules the store does not keep project into the collection's
      // description (ONT-003). The schema route writes a description once, at `createTable`, and has no action
      // that changes it (byob-admin.ts: "a changed description is ONT-007's migration"). So the plan had no step
      // for it, the reach no row, and the Schema card kept the old words. Pinned as failing in s9; green since
      // s11: `describeTable` on the surface and both engines, and the plan's step for it. (Until R10 this rode on
      // the bombshell, whose link rule was said in Person's words; a kept rule is no longer words, so it rides on
      // a sentence said again.)
      it('is carried to the collection the backend holds, and a restart reads it', async () => {
        const worded: WorldFiles = JSON.parse(JSON.stringify(ONE));
        worded.nouns.nouns[0].sentence = 'A person is someone we serve, on the account that pays for them.';
        const said = plan(ONE, worded);
        const h = await engine.make();
        const ctx = onTheRealTables(h.adapter);
        applyWorld(ctx, said.before);
        await seedOne(ctx);
        const run = await runMigration(ctx, asPlanData(said), { backup: async () => 'taken' });
        expect(run).toMatchObject({ ran: true, steps: 2 });
        const want = said.after.collections.find((c) => c.name === 'Person')!.description;
        expect(want).not.toBe(said.before.collections.find((c) => c.name === 'Person')!.description);
        expect(ctx.schema.getTableSchema('Person')!.description).toBe(want);
        expect(onTheRealTables((await engine.reopen(h)).adapter).schema.getTableSchema('Person')!.description).toBe(want);
      });
    });

    describe('R10 — a changed answer to "when what it points at goes" is carried to the link the backend keeps', () => {
      it('blocks → goes-too: refused before, the rule moved, kept after a restart, and the next delete takes the people with it', async () => {
        const goes: WorldFiles = JSON.parse(JSON.stringify(ONE));
        goes.relations.relations[0].answers!.whenTargetGoes = 'goes-too';
        const told = plan(ONE, goes);
        expect(told.steps.map((s) => ('schema' in s ? s.schema.action : 'backup' in s ? 'backup' : 'move'))).toEqual(['backup', 'setWhenTargetGoes']);
        const h = await engine.make();
        const ctx = onTheRealTables(h.adapter);
        applyWorld(ctx, told.before);
        const { accounts, people } = await seedOne(ctx);
        // The control: the world before says an account cannot go while people are on it.
        await expect(ctx.remove('Account', accounts.Northwind)).rejects.toThrow(/cannot be deleted: 2 Person records link to it by "account"/);
        const run = await runMigration(ctx, asPlanData(told), { backup: async () => 'taken' });
        expect(run).toMatchObject({ ran: true, steps: 2 });
        const linkNow = (c: ConformanceContext) => c.schema.getTableSchema('Person')!.columns!.find((x) => x.name === 'account')!.whenTargetGoes;
        expect(linkNow(ctx)).toBe('goes-too');
        const again = onTheRealTables((await engine.reopen(h)).adapter);
        expect(linkNow(again)).toBe('goes-too');
        await again.remove('Account', accounts.Northwind);
        const left = (await rows(again, 'Person')).map((r) => String(r.objectId)).sort();
        expect(left).toEqual([people.Linus]);
      });
    });
  });
}
