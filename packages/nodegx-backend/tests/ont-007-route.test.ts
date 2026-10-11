/**
 * P116 ONT-007 — the route: `POST /admin/world/migrate`, over real sockets, on SQLite and PostgreSQL.
 *
 * The executor is the backend contract's (`src/migration.ts`, README §9 R9 — the one
 * `ont-007-migration` grades on records); this file grades what the ROUTE adds around it:
 *
 *   - **a plan from a body is not trusted**: one the executor cannot read, and one that touches
 *     what `POST /admin/schema` refuses (a field every record carries), are 400 and change nothing;
 *   - **the dry run** answers what the plan would do in its own words, the rows each move takes and
 *     the rules it would move — and changes nothing; under an operator's page cap of 2 it still
 *     counts all three people (s11: the executor used to stop at the first short page);
 *   - **the backup comes first**: on SQLite the backend's own archive, on disk; on PostgreSQL the
 *     backend cannot take one, so the run is refused (409, nothing moved) until the person says
 *     where theirs is — kept in the answer;
 *   - **the bombshell** run on the records, under the cap: three memberships, the old link gone;
 *   - **the rename moves the rules** (BMG-016): on a LOCKED backend, "accounts are subscriptions
 *     now" — the accounts' `nobody` rule goes with them, and "a person sees the people on their
 *     account", three hops through the renamed collection and field, is re-said and enforced on
 *     the very next request as each person: before and after, the same people;
 *   - **part way**: a step that fails after the rename answers 500 `partly`, and the rules move for
 *     the steps that ran.
 *
 * PostgreSQL is skipped when no server answers, as BRG-005's suites are.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { WorldMigrateResponse } from '../src/server/admin-world';
import { BackendService } from '../src/service';
import { request } from './helpers/http';

// Relative on purpose, as ONT-003's spec: this package declares no dependency on the project contract.
import { planMigration, schemaPushes, type MigrationPlan, type WorldFiles, type WorldSchema } from '../../nodegx-project-contract/world';

jest.setTimeout(180000);

const FIXTURES = path.join(__dirname, '../../nodegx-project-contract/tests/fixtures');
function readWorld(fixture: string): WorldFiles {
  const dir = path.join(FIXTURES, fixture, 'docs/world');
  const read = (name: string) => JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8'));
  return { nouns: read('nouns'), relations: read('relations'), vocabulary: read('vocabulary') };
}
const ONE = readWorld('world-bombshell-before');
const MANY = readWorld('world-bombshell-after');
/** Accounts with a tier from a fixed list, and people who sign in: the world the rename starts from. */
const TIERED: WorldFiles = (() => {
  const w: WorldFiles = JSON.parse(JSON.stringify(ONE));
  w.nouns.nouns[0].signsIn = true;
  w.nouns.nouns[1].properties!.push({ name: 'tier', kind: 'choice', values: ['basic', 'gold'] });
  return w;
})();
const SUBSCRIBED: WorldFiles = (() => {
  const w: WorldFiles = JSON.parse(JSON.stringify(TIERED));
  Object.assign(w.nouns.nouns.find((n) => n.id === 'account')!, { id: 'subscription', name: 'Subscription', was: 'account' });
  for (const r of w.relations.relations) {
    if (r.from === 'account') r.from = 'subscription';
    if (r.to === 'account') r.to = 'subscription';
  }
  return w;
})();
function plan(before: WorldFiles, after: WorldFiles): MigrationPlan {
  const out = planMigration(before, after);
  if (!out.ok) throw new Error(out.problems.join('\n'));
  return out.plan;
}
const BOMBSHELL = plan(ONE, MANY);
const RENAME = plan(TIERED, SUBSCRIBED);
/** ONT-014: "a member's account is set once" — the same world, the move answered no. */
const SETTLED: WorldFiles = (() => {
  const w: WorldFiles = JSON.parse(JSON.stringify(ONE));
  w.relations.relations[0].answers!.moves = false;
  return w;
})();
const SETTLE = plan(ONE, SETTLED);
const UNSETTLE = plan(SETTLED, ONE);
/** A rule the person said in the manager, not the world: it must outlive every world rule step. */
const HAND = { where: { name: { $ne: 'Locked' } }, says: 'A locked person is not changed.' };

/** "A person sees the people on their account": login → the person → their account → everyone on it. */
const SAME_ACCOUNT = { path: { hops: [{ from: 'Person', by: 'login' }, { follow: 'account' }, { from: 'Person', by: 'account' }], maxDepth: 3 } };
const LOCKED = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'nobody' },
    creatorOwns: false
  },
  collections: {
    Account: { permissions: { find: 'nobody', get: 'nobody' } },
    Person: { permissions: { find: SAME_ACCOUNT, get: SAME_ACCOUNT, delete: 'nobody' } }
  },
  functions: {},
  files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
  signup: 'public'
};

// ------------------------------------------------------------------- engines --

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
function psql(url: string, sql: string): void {
  execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { stdio: 'ignore' });
}
let pgReachable = false;
try {
  psql(ADMIN_URL, 'SELECT 1');
  pgReachable = true;
} catch {
  pgReachable = false;
}
if (!pgReachable && process.env.NODEGX_REQUIRE_PG === '1') throw new Error(`ONT-007: NODEGX_REQUIRE_PG=1 and no PostgreSQL answered at ${ADMIN_URL}.`);

const STAMP = `${process.pid}_${Date.now().toString(36)}`;
let seq = 0;

interface Backend {
  dataDir: string;
  req: <T = unknown>(method: string, p: string, body?: unknown, headers?: Record<string, string>) => Promise<{ status: number; json: T; text: string }>;
  stop: () => Promise<void>;
}

/** A backend on a fresh database: a temp dir on SQLite, or a database of its own on PostgreSQL. */
async function startBackend(engine: 'sqlite' | 'postgres', security?: unknown): Promise<Backend> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-ont007-route-'));
  if (security) fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(security));
  fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
  let db: string | null = null;
  if (engine === 'postgres') {
    db = `nodegx_ont007r_${STAMP}_${++seq}`;
    psql(ADMIN_URL, `CREATE DATABASE ${db}`);
    process.env.NODEGX_STORAGE_URL = ADMIN_URL.replace(/\/[^/?]*(\?|$)/, `/${db}$1`);
  }
  const service = new BackendService({ dataDir, port: 0, backendId: 'ont007r', backendName: 'ONT-007 route', authToken: 't0k' });
  let base: string;
  try {
    base = (await service.start()).listen.url;
  } finally {
    delete process.env.NODEGX_STORAGE_URL;
  }
  const admin = { authorization: 'Bearer t0k' };
  return {
    dataDir,
    req: (method, p, body, headers = admin) => request(base, method, p, { body, headers }) as never,
    async stop() {
      // The dispatcher stamps its audit row without awaiting it (brg-008's note): let it land.
      await new Promise((r) => setTimeout(r, 250));
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

/** The world's schema, pushed through the schema route as the projection's write does. */
async function pushWorld(b: Backend, schema: WorldSchema): Promise<void> {
  for (const push of schemaPushes(schema)) {
    const r = await b.req('POST', '/admin/schema', { action: 'createTable', table: push.table, columns: push.columns, description: push.description, checks: push.checks, indexes: push.indexes });
    expect(r.status).toBe(200);
  }
}
const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
async function make(b: Backend, collection: string, data: Record<string, unknown>): Promise<string> {
  const r = await b.req<{ objectId: string }>('POST', `/classes/${collection}`, data);
  expect([200, 201]).toContain(r.status);
  return r.json.objectId;
}
async function columnsOf(b: Backend, table: string): Promise<string[] | null> {
  const r = await b.req<{ columns: Array<{ name: string }> }>('GET', `/admin/schema/${table}`);
  return r.status === 404 ? null : r.json.columns.map((c) => c.name);
}
async function countOf(b: Backend, collection: string): Promise<number> {
  const r = await b.req<{ count: number }>('POST', `/classes/${collection}`, { _method: 'GET', count: 1, limit: 0 });
  return r.json.count;
}
const migrate = (b: Backend, body: Record<string, unknown>) => b.req<WorldMigrateResponse & { error?: string }>('POST', '/admin/world/migrate', body);

// --------------------------------------------------------------------- suites --

for (const engine of ['sqlite', 'postgres'] as const) {
  const suite = engine === 'sqlite' || pgReachable ? describe : describe.skip;

  suite(`ONT-007 — the route, on ${engine}`, () => {
    describe('the bombshell, through the route', () => {
      let b: Backend;
      beforeAll(async () => {
        b = await startBackend(engine);
        await pushWorld(b, BOMBSHELL.before);
        const north = await make(b, 'Account', { name: 'Northwind' });
        const contoso = await make(b, 'Account', { name: 'Contoso' });
        for (const [name, account] of [['Ada', north], ['Grace', north], ['Linus', contoso]])
          await make(b, 'Person', { name, account: ptr('Account', account) });
        // An operator's page cap well under the executor's page: the run must still read every row.
        expect((await b.req('PUT', '/admin/ops', { queries: { defaultLimit: 1, maxLimit: 2 } })).status).toBe(200);
      });
      afterAll(() => b.stop());

      it('a plan the executor cannot read is 400 in words, and nothing changes', async () => {
        const r = await migrate(b, { plan: { ...BOMBSHELL, steps: [{ schema: { action: 'truncate', table: 'Person' }, says: 'empty it' }] }, run: true });
        expect(r.status).toBe(400);
        expect(r.json.error).toContain('step 1: no schema action "truncate"');
        expect(await countOf(b, 'Person')).toBe(3);
      });

      it('a plan that drops a field every record carries is 400, as the schema route would refuse it', async () => {
        const steps = [{ backup: true, says: 'b' }, { schema: { action: 'dropColumn', table: 'Person', column: 'createdAt' }, says: 'forget when people were added' }];
        const r = await migrate(b, { plan: { steps, checks: [], refused: [] }, run: true });
        expect(r.status).toBe(400);
        expect(r.json.error).toContain('"createdAt" is set by the backend on every record');
        // The schema route lists no system field; a record still carrying one is the reading.
        const people = await b.req<{ results: Array<{ createdAt?: string }> }>('POST', '/classes/Person', { _method: 'GET', limit: 1 });
        expect(people.json.results[0].createdAt).toEqual(expect.any(String));
      });

      it('the dry run says what it would do and counts every person under the cap — and changes nothing', async () => {
        const r = await migrate(b, { plan: BOMBSHELL });
        expect(r.status).toBe(200);
        expect(r.json.ran).toBe(false);
        expect(r.json.why).toBeUndefined();
        expect(r.json.says).toEqual(BOMBSHELL.steps.map((s) => s.says));
        expect(r.json.dryRun.moves).toEqual([{ says: BOMBSHELL.steps[2].says, rows: 3 }]);
        expect(r.json.rules).toEqual({ moved: [], rewritten: [] });
        expect(await columnsOf(b, 'Membership')).toBeNull();
        expect(await columnsOf(b, 'Person')).toContain('account');
      });

      if (engine === 'postgres') {
        it('on PostgreSQL the backend cannot take the backup: refused, 409, nothing moved', async () => {
          const r = await migrate(b, { plan: BOMBSHELL, run: true });
          expect(r.status).toBe(409);
          expect(r.json.error).toMatch(/Refusing to backup[\s\S]*Nothing was changed[\s\S]*backupTakenElsewhere/);
          expect(await columnsOf(b, 'Membership')).toBeNull();
          expect(await columnsOf(b, 'Person')).toContain('account');
        });
      }

      it('the run: the backup first, then every person on a membership and the old link gone', async () => {
        const r = await migrate(b, { plan: BOMBSHELL, run: true, backupTakenElsewhere: 'pg_dump at 09:00, in the ops drive' });
        expect(r.status).toBe(200);
        expect(r.json).toMatchObject({ ran: true, steps: BOMBSHELL.steps.length });
        if (engine === 'sqlite') {
          // The backend's own archive, written before the first step — the person's words were not needed.
          const archive = (r.json.backup as { archive: string }).archive;
          expect(fs.existsSync(archive)).toBe(true);
        } else {
          expect(r.json.backup).toEqual({ elsewhere: 'pg_dump at 09:00, in the ops drive' });
        }
        expect(await countOf(b, 'Membership')).toBe(3);
        expect(await countOf(b, 'Person')).toBe(3);
        expect(await columnsOf(b, 'Person')).not.toContain('account');
      });

      it('part way: a step that fails after a rename answers 500 `partly`, and the rules move for the steps that ran', async () => {
        expect((await b.req('PUT', '/admin/permissions/collections/Account', { permissions: { find: 'nobody' } })).status).toBe(200);
        const steps = [
          { backup: true, says: 'take a backup' },
          { schema: { action: 'renameTable', table: 'Account', newName: 'Ledger' }, says: 'call accounts ledgers' },
          { schema: { action: 'renameColumn', table: 'Ledger', oldName: 'nothing-here', newName: 'other' }, says: 'rename a field that is not there' }
        ];
        const r = await migrate(b, { plan: { steps, checks: [], refused: [] }, run: true, backupTakenElsewhere: 'yes' });
        expect(r.status).toBe(500);
        expect(r.json).toMatchObject({ ran: 'partly', steps: 2, failed: { step: 2, says: 'rename a field that is not there' } });
        expect(r.json.rules.moved).toEqual([{ from: 'Account', to: 'Ledger' }]);
        const rules = (await b.req<{ config: { collections: Record<string, unknown> } }>('GET', '/admin/permissions')).json.config.collections;
        expect(rules.Ledger).toEqual({ permissions: { find: 'nobody' } });
        expect(rules.Account).toBeUndefined();
      });
    });

    describe('POST /admin/schema describeTable — the words said again (s11)', () => {
      let b: Backend;
      beforeAll(async () => {
        b = await startBackend(engine);
        await pushWorld(b, BOMBSHELL.before);
      });
      afterAll(() => b.stop());
      const describedAs = async (table: string) => (await b.req<{ description?: string; columns: Array<{ name: string; description?: string }> }>('GET', `/admin/schema/${table}`)).json;

      it("says the collection's and a field's words again, and null takes a field's away", async () => {
        const r = await b.req('POST', '/admin/schema', { action: 'describeTable', table: 'Person', description: 'Someone we serve.', columns: { name: 'What they are called.', account: null } });
        expect(r.status).toBe(200);
        const now = await describedAs('Person');
        expect(now.description).toBe('Someone we serve.');
        expect(now.columns.find((c) => c.name === 'name')!.description).toBe('What they are called.');
        expect(now.columns.find((c) => c.name === 'account')).not.toHaveProperty('description');
      });

      it('a field the collection does not have, and the accounts, are 400 in words — nothing changes', async () => {
        const nope = await b.req<{ error: string }>('POST', '/admin/schema', { action: 'describeTable', table: 'Person', description: 'x', columns: { shoeSize: 'y' } });
        expect(nope.status).toBe(400);
        expect(nope.json.error).toBe('"Person" has no field "shoeSize"');
        expect((await describedAs('Person')).description).toBe('Someone we serve.');
        expect((await b.req('POST', '/admin/schema', { action: 'describeTable', table: '_User', description: 'x' })).status).toBe(400);
      });
    });

    describe('the rename moves the rules, and the running backend judges by them', () => {
      let b: Backend;
      const session: Record<string, Record<string, string>> = {};
      /** The names of the people a signed-in person is shown. */
      const seenBy = async (who: string) => {
        const r = await b.req<{ results: Array<{ name: string }> }>('POST', '/classes/Person', { _method: 'GET', limit: 2 }, session[who]);
        if (r.status !== 200) throw new Error(`${who}: ${r.status} ${r.text}`);
        return r.json.results.map((p) => p.name).sort();
      };
      beforeAll(async () => {
        b = await startBackend(engine, LOCKED);
        await pushWorld(b, RENAME.before);
        const north = await make(b, 'Account', { name: 'Northwind', tier: 'gold' });
        const south = await make(b, 'Account', { name: 'Southwind', tier: 'basic' });
        for (const [name, account] of [['ann', north], ['bob', north], ['cy', south]]) {
          const u = await b.req<{ objectId: string; sessionToken: string }>('POST', '/users', { username: name, password: `pw-${name}` }, {});
          expect(u.status).toBe(201);
          session[name] = { 'x-parse-session-token': u.json.sessionToken };
          await make(b, 'Person', { name, login: ptr('_User', u.json.objectId), account: ptr('Account', account) });
        }
      });
      afterAll(() => b.stop());

      it('before: each person sees the people on their account, and nobody sees the accounts', async () => {
        expect(await seenBy('ann')).toEqual(['ann', 'bob']);
        expect(await seenBy('cy')).toEqual(['cy']);
        expect((await b.req('POST', '/classes/Account', { _method: 'GET' }, session.ann)).status).toBe(403);
      });

      it('the dry run names the rules it would move and the path it would re-say, and moves none', async () => {
        const r = await migrate(b, { plan: RENAME });
        expect(r.status).toBe(200);
        expect(r.json.rules).toEqual({
          moved: [{ from: 'Account', to: 'Subscription' }],
          rewritten: [
            { at: 'collections.Person.permissions.find', names: { account: 'subscription' } },
            { at: 'collections.Person.permissions.get', names: { account: 'subscription' } }
          ]
        });
        const rules = (await b.req<{ config: { collections: Record<string, unknown> } }>('GET', '/admin/permissions')).json.config.collections;
        expect(Object.keys(rules).sort()).toEqual(['Account', 'Person']);
      });

      it('the run: the accounts are subscriptions, their rule went with them, and the path is re-said', async () => {
        const r = await migrate(b, { plan: RENAME, run: true, backupTakenElsewhere: 'snapshot before lunch' });
        expect(r.status).toBe(200);
        expect(r.json.ran).toBe(true);
        expect(await columnsOf(b, 'Account')).toBeNull();
        expect(await columnsOf(b, 'Person')).toContain('subscription');
        const rules = (await b.req<{ config: { collections: Record<string, { permissions: Record<string, unknown> }> } }>('GET', '/admin/permissions')).json.config.collections;
        expect(Object.keys(rules).sort()).toEqual(['Person', 'Subscription']);
        expect(rules.Subscription).toEqual({ permissions: { find: 'nobody', get: 'nobody' } });
        expect(rules.Person.permissions.find).toEqual({ path: { hops: [{ from: 'Person', by: 'login' }, { follow: 'subscription' }, { from: 'Person', by: 'subscription' }], maxDepth: 3 } });
        // Kept on disk, so a restart judges by the same rules.
        expect(JSON.parse(fs.readFileSync(path.join(b.dataDir, 'security.json'), 'utf8')).collections.Subscription).toEqual({ permissions: { find: 'nobody', get: 'nobody' } });
      });

      it('after: the next request is judged by the moved rules — the same people, and nobody sees the subscriptions', async () => {
        expect(await seenBy('ann')).toEqual(['ann', 'bob']);
        expect(await seenBy('cy')).toEqual(['cy']);
        expect((await b.req('POST', '/classes/Subscription', { _method: 'GET' }, session.ann)).status).toBe(403);
      });
    });

    describe('ONT-014 — set once, through the route: the world writes its half of `onlyWhile`, and keeps the person’s', () => {
      let b: Backend;
      let token = '';
      let ada = '';
      let locked = '';
      let contoso = '';
      let north = '';
      const rulesOnPerson = async () =>
        (await b.req<{ config: { collections: Record<string, { onlyWhile?: unknown }> } }>('GET', '/admin/permissions')).json.config.collections.Person?.onlyWhile;
      const asEve = (method: string, p: string, body?: unknown) => b.req<{ error?: string }>(method, p, body, { 'x-parse-session-token': token });
      beforeAll(async () => {
        b = await startBackend(engine, {
          version: 1,
          devOpen: false,
          defaults: { permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'nobody' }, creatorOwns: false },
          collections: { Person: { onlyWhile: { update: HAND } } },
          functions: {},
          files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
          signup: 'public'
        });
        await pushWorld(b, SETTLE.before);
        north = await make(b, 'Account', { name: 'Northwind' });
        contoso = await make(b, 'Account', { name: 'Contoso' });
        ada = await make(b, 'Person', { name: 'Ada', account: ptr('Account', north) });
        locked = await make(b, 'Person', { name: 'Locked', account: ptr('Account', north) });
        token = (await b.req<{ sessionToken: string }>('POST', '/users', { username: 'eve', password: 'pw-eve' }, {})).json.sessionToken;
      });
      afterAll(() => b.stop());

      it('the plan says it in words, last, as a step of its own', () => {
        const last = SETTLE.steps[SETTLE.steps.length - 1];
        // s18: the step carries `was`, what the world said before, so the route can tell its own writing from a hand rule.
        expect(last).toEqual({ rules: { collection: 'Person', onlyWhile: { update: { frozen: { fields: ['account'] } } }, was: null }, says: 'keep, for people: account is set once' });
        expect(UNSETTLE.steps[UNSETTLE.steps.length - 1]).toEqual({ rules: { collection: 'Person', onlyWhile: null, was: { update: { frozen: { fields: ['account'] } } } }, says: 'people keep no rule on what they were' });
      });

      it('before: a member moves account freely', async () => {
        expect((await asEve('PUT', `/classes/Person/${ada}`, { account: ptr('Account', contoso) })).status).toBe(200);
      });

      it('the run writes the world’s clause beside the person’s rule, on disk too; the account is then set once, at the door', async () => {
        const r = await migrate(b, { plan: SETTLE, run: true, backupTakenElsewhere: 'snapshot' });
        expect(r.status).toBe(200);
        expect(r.json.ran).toBe(true);
        const want = { update: { ...HAND, frozen: { fields: ['account'] } } };
        expect(await rulesOnPerson()).toEqual(want);
        expect(JSON.parse(fs.readFileSync(path.join(b.dataDir, 'security.json'), 'utf8')).collections.Person.onlyWhile).toEqual(want);
        // Ada is on Contoso since the case before; back to Northwind is a change.
        const moved = await asEve('PUT', `/classes/Person/${ada}`, { account: ptr('Account', north) });
        expect(moved.status).toBe(409);
        expect(moved.json.error).toBe('"account" on this "Person" record does not change. Nothing was changed.');
        expect((await asEve('PUT', `/classes/Person/${ada}`, { name: 'Ada L.' })).status).toBe(200);
        // The person's own rule still answers in its own words.
        const hand = await asEve('PUT', `/classes/Person/${locked}`, { name: 'Unlocked' });
        expect(hand.status).toBe(409);
        expect(hand.json.error).toBe(HAND.says);
      });

      it('said back: the world’s clause goes, the person’s stays, and the member moves again', async () => {
        const r = await migrate(b, { plan: UNSETTLE, run: true, backupTakenElsewhere: 'snapshot' });
        expect(r.status).toBe(200);
        expect(await rulesOnPerson()).toEqual({ update: HAND });
        expect((await asEve('PUT', `/classes/Person/${ada}`, { account: ptr('Account', north) })).status).toBe(200);
      });

      it('a plan that puts rules on one of the backend’s own collections is 400, and nothing changes', async () => {
        const steps = [{ backup: true, says: 'b' }, { rules: { collection: '_Session', onlyWhile: { delete: 'never' } }, says: 'never sign anyone out' }];
        const r = await migrate(b, { plan: { steps, checks: [], refused: [] }, run: true, backupTakenElsewhere: 'yes' });
        expect(r.status).toBe(400);
        expect(r.json.error).toContain('puts rules on "_Session"');
      });

      it('🔴 AC3’s schema half — a move the plan writes is read against the choices the plan leaves: to a value outside them, the dry run says so and the run is 409 before anything moves', async () => {
        const plan = (to: string[]) => ({
          steps: [
            { backup: true, says: 'b' },
            { schema: { action: 'createTable', table: 'Ticket', description: 'A thing to fix.', columns: [{ name: 'status', type: 'String' }] }, says: 'make a place for tickets' },
            { schema: { action: 'setChecks', table: 'Ticket', checks: [{ field: 'status', oneOf: ['open', 'closed'] }] }, says: 'tickets keep: status is one of its list' },
            { rules: { collection: 'Ticket', onlyWhile: { update: { moves: { status: { open: { to }, closed: { to: [] } } } } }, was: null }, says: 'a ticket goes from open to closed, never back' }
          ],
          checks: [],
          refused: []
        });
        const words = 'update.moves.status."open".to names "reopened", which "status" cannot hold — its choices are "open", "closed"';
        const dry = await migrate(b, { plan: plan(['reopened']) });
        expect(dry.status).toBe(200);
        expect(dry.json.ran).toBe(false);
        expect(dry.json.why).toContain(words);
        const run = await migrate(b, { plan: plan(['reopened']), run: true, backupTakenElsewhere: 'snapshot' });
        expect(run.status).toBe(409);
        expect(run.json.error).toContain(words);
        expect(await columnsOf(b, 'Ticket')).toBeNull();
        // The control: the choice's own values run, and the move is in force.
        const ok = await migrate(b, { plan: plan(['closed']), run: true, backupTakenElsewhere: 'snapshot' });
        expect(ok.status).toBe(200);
        const rules = (await b.req<{ config: { collections: Record<string, { onlyWhile?: unknown }> } }>('GET', '/admin/permissions')).json.config.collections.Ticket?.onlyWhile;
        expect(rules).toEqual({ update: { moves: { status: { open: { to: ['closed'] }, closed: { to: [] } } } } });
      });
    });
  });
}
