/**
 * P116 ONT-012 / ONT-014 — the reach review (ONT-014 AC6, ONT-012 §6 "owed: the Fable reach review").
 *
 * "Which door lets a hidden detail out, and which lets a value move the wrong way?" Each case below
 * is a door the two builds did not count, asserted as it SHOULD answer, on SQLite and PostgreSQL over
 * real sockets on a LOCKED backend. A red case is a finding; the task files record what was measured.
 *
 *  1. A hidden status in a move's 409: the words must not carry the old value (R-a × ONT-014).
 *  2. A hidden frozen field: a write of a guess must not answer whether the guess is right.
 *  3. A Date (and an Object) frozen field: an echo of the same value and the first write of an empty
 *     one are not changes.
 *  4. `withWorldRules`: a person's hand-written rule on a world collection is not lost in silence.
 *  5. The cascade: a `goes-too` link reaching a "never deleted" record, and `stays-unlinked` emptying a
 *     frozen link, by a bound caller's delete.
 *  6. A `$path` whose `from` or hop is the queried collection, narrowed for the caller (INCLUDECLP's
 *     "not covered").
 *  7. A dotted filter / accessor through a link, on a hidden or closed target field.
 *  8. Measured, not asserted: the ACL of a never-edited record (a ruling for Richard).
 *  9. The route: a plan whose `rules` step would replace a hand-written rule is said in the dry run and
 *     refused on a run until the loss is accepted.
 *
 * Measured red first on both engines, 2026-10-11 (every case but 7 and 8). Fixed in this session: 1, 2, 3
 * (`persistence/onlyWhile.ts`), 6 (`persistence/fieldRules.ts`), 4/9 (`server/admin-world.ts`). Case 5 is
 * bug `P116-S18-CASCADEHOLD`, `it.failing` until it is built.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { withWorldRules, worldRuleLosses } from '../src/server/admin-world';
import { BackendService } from '../src/service';
import { request } from './helpers/http';

jest.setTimeout(120000);

const OWN_STAFF = { path: { hops: [{ from: 'Staff', by: 'login' }], maxDepth: 1 } };
const RULES = (v: unknown) => ({ find: v, get: v, create: 'authenticated', update: 'authenticated', delete: 'authenticated' });

const LOCKED = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'authenticated' },
    creatorOwns: false
  },
  collections: {
    Assignment: {
      fields: { status: { read: 'role:coach' } },
      onlyWhile: {
        update: {
          moves: {
            status: {
              draft: { to: ['issued'], by: ['role:coach'] },
              issued: { to: ['withdrawn'], by: ['role:coach'] },
              withdrawn: { to: [] }
            }
          }
        }
      }
    },
    Person: {
      fields: { ssn: { read: 'role:care' } },
      onlyWhile: { update: { frozen: { fields: ['dateOfBirth', 'ssn', 'address'] } } }
    },
    Envelope: { onlyWhile: { update: { frozen: { fields: '*' } }, delete: 'never' } },
    Invoice: { onlyWhile: { update: { frozen: { fields: ['customer'], unless: { status: 'draft' } } } } },
    Staff: { permissions: RULES([OWN_STAFF]) },
    Salary: { permissions: RULES('nobody') }
  },
  functions: {},
  files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
  signup: 'public'
};

describe('4. withWorldRules — a person’s hand-written rule on a world collection', () => {
  const hand = {
    Invoice: {
      onlyWhile: {
        update: { frozen: { fields: ['amount'], unless: { status: 'draft' }, says: 'An issued invoice’s amount never changes.' }, moves: { status: { draft: { to: ['issued'] } } } },
        delete: 'never' as const
      }
    }
  };
  const world = [{ collection: 'Invoice', onlyWhile: { update: { frozen: { fields: ['number'] } } } }];

  it('the slot is the world’s (ONT-014 §6.3): its set-once replaces the hand freeze, a bare "never" goes, moves stay', () => {
    const ow = withWorldRules(hand, world).Invoice?.onlyWhile;
    expect(ow).toEqual({ update: { frozen: { fields: ['number'] }, moves: { status: { draft: { to: ['issued'] } } } } });
  });

  it('but a freeze the world could not have written (`unless`, `says`) is named as a loss, in words', () => {
    expect(worldRuleLosses(hand, world)).toEqual([
      expect.stringMatching(/"Invoice": the frozen rule written by hand \("amount" unless \{"status":"draft"\} \("An issued invoice’s amount never changes."\)\) would be replaced by the world's \("number"\)/)
    ]);
    // The world saying the same thing, or nothing hand-written there, is no loss.
    expect(worldRuleLosses(hand, [{ collection: 'Invoice', onlyWhile: hand.Invoice.onlyWhile }])).toEqual([]);
    expect(worldRuleLosses({ Invoice: { onlyWhile: { update: { frozen: { fields: ['amount'] } } } } }, world)).toEqual([]);
    expect(worldRuleLosses({}, world)).toEqual([]);
  });
});

interface Signup {
  objectId: string;
  sessionToken: string;
}
type Row = Record<string, unknown>;
interface Found {
  results: Row[];
}

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
const DB_NAME = `nodegx_ont014r_${process.pid}_${Date.now().toString(36)}`;
const psql = (url: string, sql: string): void => void execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { stdio: 'ignore' });
function pgReachable(): boolean {
  try {
    psql(ADMIN_URL, 'SELECT 1');
    return true;
  } catch {
    return false;
  }
}
const pgUrl = (() => {
  const u = new URL(ADMIN_URL);
  u.pathname = `/${DB_NAME}`;
  return u.toString();
})();
const engines: Array<{ name: string; available: boolean; storageUrl?: string }> = [
  { name: 'SQLite', available: true },
  { name: 'PostgreSQL', available: pgReachable(), storageUrl: pgUrl }
];
afterAll(() => {
  if (engines[1].available) {
    try {
      psql(ADMIN_URL, `DROP DATABASE IF EXISTS "${DB_NAME}"`);
    } catch {
      /* a client still attached; the next run uses a new name */
    }
  }
});

const date = (iso: string) => ({ __type: 'Date', iso });

for (const engine of engines) {
  const suite = engine.available ? describe : describe.skip;
  suite(`ONT-012/014 reach review, on ${engine.name}`, () => {
    let dataDir: string;
    let service: BackendService;
    let base: string;
    let previousEnv: string | undefined;
    const admin = { authorization: 'Bearer t0k' };
    const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = admin) =>
      request<T>(base, method, p, { body, headers });
    const users: Record<string, Signup> = {};
    const as = (who: string) => ({ 'x-parse-session-token': users[who].sessionToken });
    const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
    const acl = () => ({
      [users.coach.objectId]: { read: true, write: true },
      [users.ann.objectId]: { read: true, write: true },
      [users.care.objectId]: { read: true, write: true },
      '*': { read: true }
    });
    const make = async (collection: string, data: Row): Promise<string> => {
      const r = await req<{ objectId: string }>('POST', `/classes/${collection}`, { ...data, ACL: acl() });
      expect(r.status).toBe(201);
      return r.json.objectId;
    };
    const held = async (collection: string, id: string): Promise<Row> => (await req<Row>('GET', `/classes/${collection}/${id}`)).json;
    const put = (who: string, collection: string, id: string, body: Row) => req<{ error: string }>('PUT', `/classes/${collection}/${id}`, body, as(who));
    const find = (who: string, collection: string, query: Record<string, unknown>) =>
      req<Found & { error?: string }>('GET', `/classes/${collection}?${new URLSearchParams(Object.entries(query).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])).toString()}`, undefined, as(who));

    beforeAll(async () => {
      if (engine.storageUrl) psql(ADMIN_URL, `CREATE DATABASE "${DB_NAME}"`);
      previousEnv = process.env.NODEGX_STORAGE_URL;
      if (engine.storageUrl) process.env.NODEGX_STORAGE_URL = engine.storageUrl;
      else delete process.env.NODEGX_STORAGE_URL;
      dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-ont014r-'));
      fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED));
      fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
      service = new BackendService({ dataDir, port: 0, backendId: 'ont014r', backendName: 'ONT-014 review', authToken: 't0k' });
      base = (await service.start()).listen.url;
      for (const name of ['coach', 'ann', 'care']) {
        const r = await req<Signup>('POST', '/users', { username: name, password: `pw-${name}`, email: `${name}@example.org` }, {});
        expect(r.status).toBe(201);
        users[name] = r.json;
      }
      for (const role of ['coach', 'care']) {
        expect((await req('POST', '/admin/roles', { name: role })).status).toBe(201);
        expect((await req('POST', `/admin/roles/${role}/users`, { userId: users[role].objectId })).status).toBe(200);
      }
      const table = async (name: string, columns: unknown[]) => {
        const r = await req<{ error?: string }>('POST', '/admin/schema', { action: 'createTable', table: name, columns });
        expect([name, r.status, r.json?.error]).toEqual([name, 200, undefined]);
      };
      await table('Assignment', [
        { name: 'status', type: 'String' },
        { name: 'learner', type: 'Pointer', targetClass: '_User' },
        { name: 'brief', type: 'String' }
      ]);
      await table('Person', [
        { name: 'name', type: 'String' },
        { name: 'dateOfBirth', type: 'Date' },
        { name: 'ssn', type: 'String' },
        { name: 'address', type: 'Object' }
      ]);
      await table('Keeper', [{ name: 'name', type: 'String' }]);
      await table('Envelope', [
        { name: 'to', type: 'String' },
        { name: 'owner', type: 'Pointer', targetClass: 'Keeper', whenTargetGoes: 'goes-too' }
      ]);
      await table('Invoice', [
        { name: 'status', type: 'String' },
        { name: 'amount', type: 'Number' },
        { name: 'customer', type: 'Pointer', targetClass: 'Keeper', whenTargetGoes: 'stays-unlinked' }
      ]);
      await table('Staff', [
        { name: 'band', type: 'String' },
        { name: 'manager', type: 'Pointer', targetClass: 'Staff' },
        { name: 'login', type: 'Pointer', targetClass: '_User' }
      ]);
      await table('Salary', [{ name: 'amount', type: 'Number' }]);
      await table('Contract', [
        { name: 'title', type: 'String' },
        { name: 'author', type: 'Pointer', targetClass: '_User' },
        { name: 'salary', type: 'Pointer', targetClass: 'Salary' }
      ]);
    });

    afterAll(async () => {
      await service.stop();
      if (previousEnv === undefined) delete process.env.NODEGX_STORAGE_URL;
      else process.env.NODEGX_STORAGE_URL = previousEnv;
      fs.rmSync(dataDir, { recursive: true, force: true });
    });

    // ---------------------------------------------------------- 1. a hidden status in the 409 words

    it('1a. the learner cannot read `status`; the 409 for issued → draft must not tell them it is "issued"', async () => {
      const id = await make('Assignment', { status: 'issued', learner: ptr('_User', users.ann.objectId), brief: 'b' });
      expect(await held('Assignment', id)).toMatchObject({ status: 'issued' });
      const mine = await req<Row>('GET', `/classes/Assignment/${id}`, undefined, as('ann'));
      expect(mine.json.status).toBeUndefined(); // hidden from the learner, as R-a says
      const r = await put('ann', 'Assignment', id, { status: 'draft' });
      expect(r.status).not.toBe(200);
      expect(r.json.error ?? '').not.toMatch(/"issued"/);
    });

    it('1b. a write of a guess is not an oracle: setting the hidden status to its value and to another answer the same', async () => {
      const issued = await make('Assignment', { status: 'issued', learner: ptr('_User', users.ann.objectId), brief: 'b' });
      const draft = await make('Assignment', { status: 'draft', learner: ptr('_User', users.ann.objectId), brief: 'b' });
      const hit = await put('ann', 'Assignment', issued, { status: 'issued' });
      const miss = await put('ann', 'Assignment', draft, { status: 'issued' });
      expect([hit.status, hit.json.error]).toEqual([miss.status, miss.json.error]);
      expect([hit.status, hit.json.error]).toEqual([409, '"status" cannot move to "issued" from the value it has now. Nothing was changed.']);
      expect(await held('Assignment', draft)).toMatchObject({ status: 'draft' });
      // The coach, who reads it, still gets the old value in the words (ONT-014 §6.1 unchanged).
      const coach = await put('coach', 'Assignment', issued, { status: 'draft' });
      expect([coach.status, coach.json.error]).toEqual([409, '"status" moves from "issued" only to "withdrawn", not to "draft". Nothing was changed.']);
    });

    // ---------------------------------------------------------- 2. a hidden frozen field

    it('2. the learner cannot read `ssn`; writing the right value and a wrong one must answer the same', async () => {
      const id = await make('Person', { name: 'Ann', ssn: '123-45-6789' });
      const hit = await put('ann', 'Person', id, { ssn: '123-45-6789' });
      const miss = await put('ann', 'Person', id, { ssn: '000-00-0000' });
      expect([hit.status, hit.json.error]).toEqual([miss.status, miss.json.error]);
      expect(hit.status).toBe(409);
      expect(await held('Person', id)).toMatchObject({ ssn: '123-45-6789' });
      // The carer, who reads it, echoes it freely, and an empty one is written once by them.
      expect((await put('care', 'Person', id, { ssn: '123-45-6789', name: 'Ann B.' })).status).toBe(200);
      const empty = await make('Person', { name: 'Bo' });
      expect((await put('care', 'Person', empty, { ssn: '111-11-1111' })).status).toBe(200);
      // Not by the learner: "is it set yet?" is a detail too.
      const empty2 = await make('Person', { name: 'Bo 2' });
      expect((await put('ann', 'Person', empty2, { ssn: '111-11-1111' })).status).toBe(409);
    });

    // ---------------------------------------------------------- 3. a Date / Object frozen field

    it('3a. a Date set once: an echo of the same date with another change is not a change', async () => {
      const id = await make('Person', { name: 'Cy', dateOfBirth: date('1990-01-01T00:00:00.000Z') });
      const r = await put('care', 'Person', id, { name: 'Cy B.', dateOfBirth: date('1990-01-01T00:00:00.000Z') });
      expect([r.status, r.json.error]).toEqual([200, undefined]);
      expect(await held('Person', id)).toMatchObject({ name: 'Cy B.' });
    });

    it('3b. a Date set once: empty at create, written later → 200; changed after that → 409', async () => {
      const id = await make('Person', { name: 'Di' });
      const first = await put('care', 'Person', id, { dateOfBirth: date('1985-05-05T00:00:00.000Z') });
      expect([first.status, first.json.error]).toEqual([200, undefined]);
      const second = await put('care', 'Person', id, { dateOfBirth: date('1985-06-06T00:00:00.000Z') });
      expect(second.status).toBe(409);
      expect(await held('Person', id)).toMatchObject({ dateOfBirth: { __type: 'Date', iso: '1985-05-05T00:00:00.000Z' } });
    });

    it('3c. an Object set once: empty at create, written later → 200; changed after that → 409', async () => {
      const id = await make('Person', { name: 'Ed' });
      const first = await put('care', 'Person', id, { address: { street: 'Main St' } });
      expect([first.status, first.json.error]).toEqual([200, undefined]);
      const second = await put('care', 'Person', id, { address: { street: 'Other St' } });
      expect(second.status).toBe(409);
      expect(await held('Person', id)).toMatchObject({ address: { street: 'Main St' } });
      // Known limit (onlyWhile.ts): an Object cannot be compared in one statement, so its echo is a change.
      expect((await put('care', 'Person', id, { address: { street: 'Main St' }, name: 'Ed B.' })).status).toBe(409);
    });

    // ---------------------------------------------------------- 5. the cascade

    it.failing('5a. [P116-S18-CASCADEHOLD] a `goes-too` link into a never-deleted record: the learner’s delete of the keeper must not take the envelope', async () => {
      const keeper = await make('Keeper', { name: 'K1' });
      const env = await make('Envelope', { to: 'Ann', owner: ptr('Keeper', keeper) });
      const r = await req<{ error?: string }>('DELETE', `/classes/Keeper/${keeper}`, undefined, as('ann'));
      const after = await req<Row>('GET', `/classes/Envelope/${env}`);
      expect({ status: r.status, error: r.json?.error, envelope: after.status }).toMatchObject({ envelope: 200 });
    });

    it.failing('5b. [P116-S18-CASCADEHOLD] a `stays-unlinked` link that is frozen on the issued invoice: the learner’s delete of the keeper must not empty it', async () => {
      const keeper = await make('Keeper', { name: 'K2' });
      const inv = await make('Invoice', { status: 'issued', amount: 10, customer: ptr('Keeper', keeper) });
      const r = await req<{ error?: string }>('DELETE', `/classes/Keeper/${keeper}`, undefined, as('ann'));
      const after = await held('Invoice', inv);
      expect({ status: r.status, error: r.json?.error, customer: after.customer ?? null }).toMatchObject({ customer: expect.objectContaining({ objectId: keeper }) });
    });

    // ---------------------------------------------------------- 6. a path through the narrowed queried collection

    it('6. ann may find only her own Staff row; a `$path` from Staff rows she may not read, landing on hers, is refused', async () => {
      const boss = await make('Staff', { band: 'A' });
      const mine = await make('Staff', { band: 'B', manager: ptr('Staff', boss), login: ptr('_User', users.ann.objectId) });
      await make('Staff', { band: 'C', manager: ptr('Staff', mine) });
      // Control: the narrowing holds on a plain filter.
      const plain = await find('ann', 'Staff', { where: { band: 'C' } });
      expect([plain.status, plain.json.results?.length]).toEqual([200, 0]);
      const own = await find('ann', 'Staff', { where: {} });
      expect(own.json.results?.map((r) => r.objectId)).toEqual([mine]);
      // One hop, then a repeated hop, each from rows outside her narrowing.
      const oneHop = await find('ann', 'Staff', { where: { $path: { from: { collection: 'Staff', where: { band: 'C' } }, hops: [{ follow: 'manager' }], maxDepth: 1 } } });
      const repeated = await find('ann', 'Staff', { where: { $path: { from: { collection: 'Staff', where: { band: 'C' } }, hops: [{ follow: 'manager', repeat: true }], maxDepth: 4 } } });
      expect({ oneHop: [oneHop.status, oneHop.json.results?.length ?? oneHop.json.error], repeated: [repeated.status, repeated.json.results?.length ?? repeated.json.error] }).toEqual({
        oneHop: [403, expect.stringMatching(/only some records of "Staff"/)],
        repeated: [403, expect.stringMatching(/only some records of "Staff"/)]
      });
    });

    // ---------------------------------------------------------- 7. a dotted filter through a link

    it('7. a dotted filter or accessor through a link must not answer for a hidden or closed target field', async () => {
      const salary = await make('Salary', { amount: 91000 });
      const contract = await make('Contract', { title: 'c1', author: ptr('_User', users.ann.objectId), salary: ptr('Salary', salary) });
      const byEmail = await find('coach', 'Contract', { where: { 'author.email': 'ann@example.org' } });
      const byAmount = await find('ann', 'Contract', { where: { 'salary.amount': 91000 } });
      const agg = await req<{ results?: Row[]; error?: string }>('GET', `/aggregate/Contract?group=${encodeURIComponent(JSON.stringify({ m: { $max: '$salary.amount' } }))}`, undefined, as('ann'));
      const leaked = (r: { status: number; json: Found | { results?: Row[] } }) =>
        r.status === 200 && (r.json.results ?? []).some((x) => x.objectId === contract);
      expect({
        byEmail: [byEmail.status, leaked(byEmail)],
        byAmount: [byAmount.status, leaked(byAmount)],
        agg: [agg.status, agg.json.results?.[0]?.m ?? null]
      }).toEqual({ byEmail: [expect.any(Number), false], byAmount: [expect.any(Number), false], agg: [expect.any(Number), expect.not.stringMatching(/^91000$/)] });
      expect(agg.json.results?.[0]?.m ?? null).not.toBe(91000);
    });

    // ---------------------------------------------------------- 8. measured, not asserted

    it('8. (measured) the ACL of a never-edited envelope, rewritten by a bound writer', async () => {
      const keeper = await make('Keeper', { name: 'K3' });
      const env = await make('Envelope', { to: 'Ann', owner: ptr('Keeper', keeper) });
      const r = await put('ann', 'Envelope', env, { ACL: { [users.ann.objectId]: { read: true, write: true } } });
      // eslint-disable-next-line no-console
      console.log(`[reach-review ${engine.name}] 8. ACL rewrite on a never-edited record: ${r.status} ${r.json?.error ?? ''}`);
      expect([200, 409]).toContain(r.status);
    });

    // ---------------------------------------------------------- 9. the route and a hand-written rule

    it('9. a world step that would replace Invoice’s hand-written `unless` freeze: said in the dry run, 409 on a run, through with acceptLosses', async () => {
      const steps = [{ backup: true, says: 'b' }, { rules: { collection: 'Invoice', onlyWhile: { update: { frozen: { fields: ['amount'] } } } }, says: 'keep, for invoices: amount is set once' }];
      const plan = { steps, checks: [], refused: [] };
      const dry = await req<{ ran: boolean; why?: string }>('POST', '/admin/world/migrate', { plan });
      expect([dry.status, dry.json.ran]).toEqual([200, false]);
      expect(dry.json.why).toMatch(/"Invoice": the frozen rule written by hand \("customer" unless \{"status":"draft"\}\) would be replaced by the world's \("amount"\)/);
      const refused = await req<{ error: string }>('POST', '/admin/world/migrate', { plan, run: true, backupTakenElsewhere: 'yes' });
      expect(refused.status).toBe(409);
      expect(refused.json.error).toMatch(/replace a rule written by hand/);
      const rules = async () => JSON.stringify((await req<{ config: { collections: Record<string, unknown> } }>('GET', '/admin/permissions')).json.config.collections.Invoice);
      expect(await rules()).toContain('"customer"');
      const ran = await req<{ ran: unknown }>('POST', '/admin/world/migrate', { plan, run: true, backupTakenElsewhere: 'yes', acceptLosses: true });
      expect([ran.status, ran.json.ran]).toEqual([200, true]);
      expect(await rules()).toContain('"amount"');
      expect(await rules()).not.toContain('"customer"');
    });
  });
}
