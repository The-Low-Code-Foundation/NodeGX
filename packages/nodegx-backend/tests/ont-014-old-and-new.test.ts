/**
 * P116 ONT-014 AC1–AC3 — *old and new*: a rule that reads the record before the change, the body, and
 * who is making it, held inside the write. Kept by the backend, on SQLite and PostgreSQL, over real
 * sockets on a LOCKED backend. The person's sentences (task §1) are the `security.json`:
 *
 *  - **"An assignment goes from draft to issued to withdrawn. It never goes back. Only a coach may
 *    issue one."** (`moves`), and the learner may withdraw their own (a path rule in `by`);
 *  - **"Once an invoice is issued, its number and its amount never change. We can still mark it
 *    paid."** (`frozen` `unless` draft), also against an increment and a relation;
 *  - **"A person's date of birth is written once."** (`frozen`, no `unless`: set once);
 *  - **"A sealed envelope is never edited and never deleted."** (`frozen: "*"`, `delete: "never"`).
 *
 * Every refusal is a 409 carrying the clause's words, at every door that takes an update or a delete
 * (PUT, the upsert, BYOB PUT, the batch, the increment, the relation-only PUT, DELETE, BYOB DELETE,
 * the batch's delete). Writing the value a field already has is not a change. A row the caller may
 * not write is still 404. The admin is not bound. Three mutants, each caught by name.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as onlyWhile from '../src/persistence/onlyWhile';
import * as model from '../src/security/model';
import { tablesAfterPlan } from '../src/server/admin-world';
import { BackendService } from '../src/service';
import { request } from './helpers/http';

jest.setTimeout(120000);

const LEARNER_OWN = { path: { hops: [{ from: 'Assignment', by: 'learner' }], maxDepth: 1 } };
const ISSUED_FROZEN = 'An issued assignment’s learner and brief never change.';
const INVOICE_FROZEN = 'Once an invoice is issued, its number and its amount never change.';

const LOCKED = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'authenticated' },
    creatorOwns: false
  },
  collections: {
    Assignment: {
      onlyWhile: {
        update: {
          moves: {
            status: {
              draft: { to: ['issued'], by: ['role:coach'] },
              issued: { to: ['withdrawn'], by: ['role:coach', LEARNER_OWN] },
              withdrawn: { to: [], says: 'A withdrawn assignment stays withdrawn.' }
            }
          },
          frozen: { fields: ['learner', 'brief'], unless: { status: 'draft' }, says: ISSUED_FROZEN }
        }
      }
    },
    Invoice: { onlyWhile: { update: { frozen: { fields: ['number', 'amount', 'lines'], unless: { status: 'draft' }, says: INVOICE_FROZEN } } } },
    Person: { onlyWhile: { update: { frozen: { fields: ['dateOfBirth'] } } } },
    Envelope: { onlyWhile: { update: { frozen: { fields: '*' } }, delete: 'never' } }
  },
  functions: {},
  files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
  signup: 'public'
};

describe('ONT-014 AC3 — the validator', () => {
  const withRule = (onlyWhileValue: unknown, collection = 'Assignment') => {
    const cfg = JSON.parse(JSON.stringify(LOCKED));
    cfg.collections = { [collection]: { onlyWhile: onlyWhileValue } };
    return model.validateSecurityConfig(cfg).join(' | ');
  };

  it('the locked config is valid', () => {
    expect(model.validateSecurityConfig(LOCKED)).toEqual([]);
  });

  it.each([
    [{ update: { moves: {} } }, /naming at least one field/],
    [{ update: { moves: { status: { draft: { to: 'issued' } } } } }, /to must be a list of values/],
    [{ update: { moves: { status: { draft: { to: ['draft'] } } } } }, /staying is not a move/],
    [{ update: { moves: { status: { draft: { to: ['issued'], by: 'coaches' } } } } }, /by: unknown rule value "coaches"/],
    [{ update: { moves: { status: { draft: { to: ['issued'], when: 'now' } } } } }, /unknown key "when"/],
    [{ update: { moves: { updatedAt: { a: { to: [] } } } } }, /bookkeeping is not a value a person moves/],
    [{ update: { frozen: { fields: [] } } }, /non-empty list of field names, or "\*"/],
    [{ update: { frozen: { fields: ['amount'] }, except: ['amount'], where: { status: 'draft' } } }, /both frozen and excepted/],
    [{ update: { frozen: { fields: ['amount'], unless: { $path: {} } } } }, /unless may not use \$path/],
    [{ update: { frozen: { fields: ['createdAt'] } } }, /bookkeeping, kept by the backend/],
    [{ update: { frozen: { fields: ['amount'], says: ' ' } } }, /says must be a sentence/],
    [{ delete: 'sometimes' }, /delete must be "never" or an object/],
    [{ delete: { where: { sealed: true }, never: true } }, /unknown key "never"/],
    [{ update: { says: 'x' } }, /where must be an object/]
  ])('refuses %j', (value, message) => {
    expect(withRule(value)).toMatch(message);
  });

  it('refuses it on a system collection', () => {
    expect(withRule({ delete: 'never' }, '_User')).toMatch(/system collections/);
  });
});

describe('ONT-014 AC3 — the schema half: a move read against the schema it is kept on', () => {
  /** `Ticket.status` a choice of three, `Ticket.title` text, `Ticket.priority` a Number, `Ticket.size` a choice of numbers. */
  const TICKET = {
    columns: [
      { name: 'status', type: 'String' },
      { name: 'title', type: 'String' },
      { name: 'priority', type: 'Number' },
      { name: 'size', type: 'Number' },
      { name: 'done', type: 'Boolean' }
    ],
    checks: [
      { field: 'status', oneOf: ['open', 'closed', 'archived'] },
      { field: 'size', oneOf: [1, 2, 3] }
    ]
  };
  const tableOf = (c: string) => (c === 'Ticket' ? TICKET : c === 'Firstuse' ? { columns: [] } : null);
  const problems = (moves: unknown, collection = 'Ticket') =>
    model.onlyWhileSchemaProblems({ [collection]: { onlyWhile: { update: { moves } } } } as never, tableOf).join(' | ');

  it('a move between the choice’s own values, on text, or on a field the schema does not declare, is kept', () => {
    expect(problems({ status: { open: { to: ['closed'] }, closed: { to: ['archived', 'open'] }, '*': { to: [] } } })).toBe('');
    expect(problems({ title: { draft: { to: ['final'] } } })).toBe('');
    // Not declared is not a mistake: a table made by first use records no columns, and a column can hold data while missing from _Schema.
    expect(problems({ stage: { a: { to: ['b'] } } })).toBe('');
    expect(problems({ status: { a: { to: ['b'] } } }, 'Firstuse')).toBe('');
    expect(problems({ status: { a: { to: ['b'] } } }, 'Nowhere')).toBe('');
  });

  it.each([
    [{ status: { open: { to: ['reopened'] } } }, 'collections.Ticket.onlyWhile: update.moves.status."open".to names "reopened", which "status" cannot hold — its choices are "open", "closed", "archived"'],
    [{ status: { draft: { to: ['open'] } } }, 'collections.Ticket.onlyWhile: update.moves.status."draft": "status" is never "draft" — its choices are "open", "closed", "archived"'],
    [{ priority: { '1': { to: ['2'] } } }, 'collections.Ticket.onlyWhile: update.moves.priority: "priority" is a Number; only a choice or text has values that move'],
    [{ size: { '1': { to: ['2'] } } }, 'collections.Ticket.onlyWhile: update.moves.size: "size" is a choice of numbers; only a choice or text has values that move'],
    [{ done: { false: { to: ['true'] } } }, 'collections.Ticket.onlyWhile: update.moves.done: "done" is a Boolean; only a choice or text has values that move']
  ])('refuses %j in words', (moves, words) => {
    expect(problems(moves)).toBe(words);
  });

  it('tablesAfterPlan: the columns and choices a plan leaves — made, added, renamed, dropped, its checks set; a table there already keeps its columns', () => {
    const now = (c: string) => (c === 'Ticket' ? TICKET : null);
    const after = tablesAfterPlan(
      [
        { backup: true, says: 'b' },
        { schema: { action: 'createTable', table: 'Ticket', description: '', columns: [{ name: 'other', type: 'String' }] }, says: 'kept' },
        { schema: { action: 'createTable', table: 'Job', description: '', columns: [{ name: 'stage', type: 'String' }] }, says: 'made' },
        { schema: { action: 'setChecks', table: 'Job', checks: [{ field: 'stage', oneOf: ['new', 'done'] }] }, says: 'listed' },
        { schema: { action: 'renameColumn', table: 'Ticket', oldName: 'title', newName: 'name' }, says: 'r' },
        { schema: { action: 'dropColumn', table: 'Ticket', column: 'priority' }, says: 'd' },
        { schema: { action: 'renameTable', table: 'Ticket', newName: 'Issue' }, says: 'r' }
      ],
      now
    );
    expect(after('Ticket')).toBeUndefined();
    expect(after('Issue')?.columns?.map((c) => c.name)).toEqual(['status', 'name', 'size', 'done']);
    expect(after('Issue')?.checks).toEqual(TICKET.checks);
    expect(after('Job')).toEqual({ columns: [{ name: 'stage', type: 'String' }], checks: [{ field: 'stage', oneOf: ['new', 'done'] }] });
    expect(TICKET.columns).toHaveLength(5); // today's schema is read, never written
  });
});

interface Signup {
  objectId: string;
  sessionToken: string;
}
type Row = Record<string, unknown>;

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
const DB_NAME = `nodegx_ont014_${process.pid}_${Date.now().toString(36)}`;
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

for (const engine of engines) {
  const suite = engine.available ? describe : describe.skip;
  suite(`ONT-014 AC1/AC2 — old and new, on ${engine.name}`, () => {
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
    /** Readable by everyone, writable by the coach and both learners — so every refusal below is the rule's, not the row's. */
    const acl = () => ({
      [users.coach.objectId]: { read: true, write: true },
      [users.ann.objectId]: { read: true, write: true },
      [users.cy.objectId]: { read: true, write: true },
      '*': { read: true }
    });
    const make = async (collection: string, data: Row): Promise<string> => {
      const r = await req<{ objectId: string }>('POST', `/classes/${collection}`, { ...data, ACL: acl() });
      expect(r.status).toBe(201);
      return r.json.objectId;
    };
    const assignment = (status: string, learner = 'ann') =>
      make('Assignment', { status, learner: ptr('_User', users[learner].objectId), brief: 'Read chapter 3' });
    const held = async (collection: string, id: string): Promise<Row> => (await req<Row>('GET', `/classes/${collection}/${id}`)).json;
    const put = (who: string, collection: string, id: string, body: Row) => req<{ error: string }>('PUT', `/classes/${collection}/${id}`, body, as(who));
    const expect409 = (r: { status: number; json: unknown }, words: string | RegExp, collection?: string) => {
      expect(r.status).toBe(409);
      expect(r.json).toMatchObject({ reason: 'not-while', ...(collection ? { collection } : {}) });
      const error = (r.json as { error: string }).error;
      if (typeof words === 'string') expect(error).toBe(words);
      else expect(error).toMatch(words);
    };

    beforeAll(async () => {
      if (engine.storageUrl) psql(ADMIN_URL, `CREATE DATABASE "${DB_NAME}"`);
      previousEnv = process.env.NODEGX_STORAGE_URL;
      if (engine.storageUrl) process.env.NODEGX_STORAGE_URL = engine.storageUrl;
      else delete process.env.NODEGX_STORAGE_URL;
      dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-ont014-'));
      fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED));
      fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
      service = new BackendService({ dataDir, port: 0, backendId: 'ont014', backendName: 'ONT-014', authToken: 't0k' });
      base = (await service.start()).listen.url;
      for (const name of ['coach', 'ann', 'cy', 'bob']) {
        const r = await req<Signup>('POST', '/users', { username: name, password: `pw-${name}` }, {});
        expect(r.status).toBe(201);
        users[name] = r.json;
      }
      expect((await req('POST', '/admin/roles', { name: 'coach' })).status).toBe(201);
      expect((await req('POST', '/admin/roles/coach/users', { userId: users.coach.objectId })).status).toBe(200);
      const table = (name: string, columns: unknown[]) => req('POST', '/admin/schema', { action: 'createTable', table: name, columns });
      expect((await table('Line', [{ name: 'text', type: 'String' }])).status).toBe(200);
      expect(
        (
          await table('Assignment', [
            { name: 'status', type: 'String' },
            { name: 'learner', type: 'Pointer', targetClass: '_User' },
            { name: 'brief', type: 'String' },
            { name: 'note', type: 'String' },
            { name: 'ref', type: 'String' }
          ])
        ).status
      ).toBe(200);
      expect((await req('POST', '/admin/schema', { action: 'setIndexes', table: 'Assignment', indexes: [{ fields: ['ref'], unique: true }] })).status).toBe(200);
      expect(
        (
          await table('Invoice', [
            { name: 'status', type: 'String' },
            { name: 'number', type: 'Number' },
            { name: 'amount', type: 'Number' },
            { name: 'paidOn', type: 'String' },
            { name: 'lines', type: 'Relation', targetClass: 'Line' }
          ])
        ).status
      ).toBe(200);
      expect((await table('Person', [{ name: 'name', type: 'String' }, { name: 'dateOfBirth', type: 'String' }])).status).toBe(200);
      expect((await table('Envelope', [{ name: 'to', type: 'String' }, { name: 'sealed', type: 'Boolean' }])).status).toBe(200);
    });

    afterAll(async () => {
      await service.stop();
      if (previousEnv === undefined) delete process.env.NODEGX_STORAGE_URL;
      else process.env.NODEGX_STORAGE_URL = previousEnv;
      fs.rmSync(dataDir, { recursive: true, force: true });
    });

    // ------------------------------------------------------------------ moves

    it('draft → issued by the coach goes through; issued → withdrawn by the coach goes through', async () => {
      const id = await assignment('draft');
      expect((await put('coach', 'Assignment', id, { status: 'issued' })).status).toBe(200);
      expect((await put('coach', 'Assignment', id, { status: 'withdrawn' })).status).toBe(200);
      expect(await held('Assignment', id)).toMatchObject({ status: 'withdrawn' });
    });

    it('🔴 the learner issuing their own draft is a 409 that says it is not theirs to make, and it stays a draft', async () => {
      const id = await assignment('draft');
      expect409(await put('ann', 'Assignment', id, { status: 'issued' }), 'Moving "status" from "draft" to "issued" is not yours to make. Nothing was changed.', 'Assignment');
      expect(await held('Assignment', id)).toMatchObject({ status: 'draft' });
    });

    it('🔴 issued → draft is a 409 for anyone bound, the coach included: it never goes back', async () => {
      const id = await assignment('issued');
      for (const who of ['coach', 'ann']) {
        expect409(await put(who, 'Assignment', id, { status: 'draft' }), '"status" moves from "issued" only to "withdrawn", not to "draft". Nothing was changed.');
      }
      expect(await held('Assignment', id)).toMatchObject({ status: 'issued' });
    });

    it('🔴 withdrawn → anything is a 409 in the rule’s own words', async () => {
      const id = await assignment('withdrawn');
      for (const to of ['draft', 'issued']) expect409(await put('coach', 'Assignment', id, { status: to }), 'A withdrawn assignment stays withdrawn.');
    });

    it('setting status to the value it has is not a move, and an unrelated field changes freely', async () => {
      const id = await assignment('withdrawn');
      expect((await put('ann', 'Assignment', id, { status: 'withdrawn', note: 'kept' })).status).toBe(200);
      expect(await held('Assignment', id)).toMatchObject({ status: 'withdrawn', note: 'kept' });
    });

    it('a path rule in `by`: the learner withdraws their OWN issued assignment, never another learner’s', async () => {
      const own = await assignment('issued', 'ann');
      const cys = await assignment('issued', 'cy');
      expect((await put('ann', 'Assignment', own, { status: 'withdrawn' })).status).toBe(200);
      expect409(await put('ann', 'Assignment', cys, { status: 'withdrawn' }), 'Moving "status" from "issued" to "withdrawn" is not yours to make. Nothing was changed.');
      expect(await held('Assignment', cys)).toMatchObject({ status: 'issued' });
    });

    // ----------------------------------------------------------------- frozen

    it('🔴 a frozen field changed on an issued assignment is a 409; the same change on a draft goes through', async () => {
      const issued = await assignment('issued');
      expect409(await put('coach', 'Assignment', issued, { brief: 'Read chapter 4' }), ISSUED_FROZEN);
      expect(await held('Assignment', issued)).toMatchObject({ brief: 'Read chapter 3' });
      const draft = await assignment('draft');
      expect((await put('coach', 'Assignment', draft, { brief: 'Read chapter 4' })).status).toBe(200);
      // An echo of the whole record with the frozen field unchanged is not a change.
      expect((await put('coach', 'Assignment', issued, { brief: 'Read chapter 3', note: 'echo' })).status).toBe(200);
    });

    it('🔴 a move and a frozen field in one write: the move is allowed, the frozen field is not — refused whole', async () => {
      const id = await assignment('draft');
      // draft → issued moves it, but the brief is judged on the OLD record (a draft): allowed. Issued → withdrawn with a new brief is not.
      expect((await put('coach', 'Assignment', id, { status: 'issued', brief: 'Final brief' })).status).toBe(200);
      expect409(await put('coach', 'Assignment', id, { status: 'withdrawn', brief: 'Another' }), ISSUED_FROZEN);
      expect(await held('Assignment', id)).toMatchObject({ status: 'issued', brief: 'Final brief' });
    });

    it('🔴 an issued invoice: number and amount refused (PUT and $inc), marking it paid goes through, adding a line refused', async () => {
      const id = await make('Invoice', { status: 'issued', number: 7, amount: 100 });
      expect409(await put('ann', 'Invoice', id, { amount: 1 }), INVOICE_FROZEN, 'Invoice');
      expect409(await put('ann', 'Invoice', id, { amount: { __op: 'Increment', amount: 5 } }), INVOICE_FROZEN);
      expect((await put('ann', 'Invoice', id, { paidOn: '2026-10-11' })).status).toBe(200);
      const line = (await req<{ objectId: string }>('POST', '/classes/Line', { text: 'extra' })).json.objectId;
      const relate = { lines: { __op: 'AddRelation', objects: [ptr('Line', line)] } };
      expect409(await put('ann', 'Invoice', id, relate), INVOICE_FROZEN);
      expect(await held('Invoice', id)).toMatchObject({ number: 7, amount: 100, paidOn: '2026-10-11' });
      const draft = await make('Invoice', { status: 'draft', number: 8, amount: 50 });
      expect((await put('ann', 'Invoice', draft, { amount: { __op: 'Increment', amount: 5 } })).status).toBe(200);
      expect((await put('ann', 'Invoice', draft, relate)).status).toBe(200);
    });

    it('🔴 a date of birth set at create is set once: changed → 409, the same value → 200; empty at create, set later → 200, then fixed', async () => {
      const set = await make('Person', { name: 'Ann', dateOfBirth: '1990-01-01' });
      expect409(await put('ann', 'Person', set, { dateOfBirth: '1991-01-01' }), '"dateOfBirth" on this "Person" record does not change. Nothing was changed.');
      expect((await put('ann', 'Person', set, { dateOfBirth: '1990-01-01', name: 'Ann B.' })).status).toBe(200);
      const later = await make('Person', { name: 'Cy' });
      expect((await put('ann', 'Person', later, { dateOfBirth: '1985-05-05' })).status).toBe(200);
      expect409(await put('ann', 'Person', later, { dateOfBirth: '1985-06-06' }), /"dateOfBirth" on this "Person" record does not change/);
      expect(await held('Person', later)).toMatchObject({ dateOfBirth: '1985-05-05' });
    });

    it('🔴 a sealed envelope is never edited and never deleted — DELETE, BYOB DELETE, the batch; it stands', async () => {
      const id = await make('Envelope', { to: 'Ellie', sealed: true });
      expect409(await put('ann', 'Envelope', id, { to: 'Saoirse' }), '"to" on this "Envelope" record does not change. Nothing was changed.');
      const never = 'This "Envelope" record is never deleted. Nothing was changed.';
      expect409(await req('DELETE', `/classes/Envelope/${id}`, undefined, as('ann')), never);
      expect((await req('DELETE', `/api/Envelope/${id}`, undefined, as('ann'))).status).toBe(409);
      const batch = await req<{ results: Array<{ error: string }> }>(
        'POST',
        '/api/_batch',
        { operations: [{ method: 'delete', collection: 'Envelope', objectId: id }] },
        as('ann')
      );
      expect(batch.json.results[0].error).toBe(never);
      expect(await held('Envelope', id)).toMatchObject({ to: 'Ellie' });
    });

    // ------------------------------------------------------------------ doors

    it('the upsert and BYOB PUT refuse a move the same way', async () => {
      const id = await assignment('draft');
      expect((await req('PUT', `/classes/Assignment/${id}`, { ref: `A-${id}` })).status).toBe(200);
      const upsert = await req('POST', '/classes/Assignment', { ref: `A-${id}`, status: 'issued' }, { ...as('ann'), 'x-nodegx-upsert': 'ref' });
      expect409(upsert, /not yours to make/);
      expect409(await req('PUT', `/api/Assignment/${id}`, { status: 'issued' }, as('ann')), /not yours to make/);
      expect(await held('Assignment', id)).toMatchObject({ status: 'draft' });
    });

    it('the batch judges each move on the record as the move before it left it: draft → issued → withdrawn goes through, → draft does not', async () => {
      const id = await assignment('draft');
      const save = (status: string) => ({ method: 'save', collection: 'Assignment', objectId: id, data: { status } });
      const batch = await req<{ results: Row[] }>('POST', '/api/_batch', { operations: [save('issued'), save('withdrawn'), save('draft')] }, as('coach'));
      expect(batch.status).toBe(200);
      expect(batch.json.results[0]).not.toHaveProperty('error');
      expect(batch.json.results[1]).not.toHaveProperty('error');
      expect(batch.json.results[2]).toMatchObject({ error: 'A withdrawn assignment stays withdrawn.', reason: 'not-while' });
      expect(await held('Assignment', id)).toMatchObject({ status: 'withdrawn' });
    });

    it('the MCP’s update, for a key acting as the learner, says the move is not theirs and changes nothing', async () => {
      const made = await req<{ secret: string }>('POST', '/admin/keys', { name: `as-ann-${engine.name}`, scopes: ['classes:*'], actsAsUserId: users.ann.objectId });
      expect(made.status).toBe(201);
      const id = await assignment('draft');
      const res = await fetch(`${base}/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-nodegx-api-key': made.json.secret },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'Assignment_update', arguments: { objectId: id, status: 'issued' } } })
      });
      const reply = (await res.json()) as { result?: { isError?: boolean; content?: Array<{ text: string }> } };
      expect(reply.result?.isError).toBe(true);
      expect(reply.result?.content?.[0]?.text).toMatch(/Moving "status" from "draft" to "issued" is not yours to make/);
      expect(await held('Assignment', id)).toMatchObject({ status: 'draft' });
    });

    it('🔴 a row the caller may not write is still 404, never 409', async () => {
      const id = await assignment('issued');
      expect((await put('bob', 'Assignment', id, { status: 'draft' })).status).toBe(404);
      const env = await make('Envelope', { to: 'x', sealed: true });
      expect((await req('DELETE', `/classes/Envelope/${env}`, undefined, as('bob'))).status).toBe(404);
    });

    it('the admin credential is not bound: issued → draft, a frozen amount, a sealed envelope deleted', async () => {
      const id = await assignment('issued');
      expect((await req('PUT', `/classes/Assignment/${id}`, { status: 'draft' })).status).toBe(200);
      const inv = await make('Invoice', { status: 'issued', number: 1, amount: 1 });
      expect((await req('PUT', `/classes/Invoice/${inv}`, { amount: 2 })).status).toBe(200);
      const env = await make('Envelope', { to: 'x', sealed: true });
      expect((await req('DELETE', `/classes/Envelope/${env}`)).status).toBe(200);
    });

    it('AC5 — the permissions save (the page’s and the MCP’s body: the matrix alone) and the revert keep moves, frozen and "never"', async () => {
      type Config = { collections: Record<string, { onlyWhile?: unknown }> };
      const rules = () => (service as unknown as { security: { config: Config } }).security.config.collections;
      const before = JSON.stringify([rules().Assignment?.onlyWhile, rules().Envelope?.onlyWhile]);
      for (const c of ['Assignment', 'Envelope']) {
        expect((await req('PUT', `/admin/permissions/collections/${c}`, { permissions: { update: 'authenticated' }, creatorOwns: false })).status).toBe(200);
        expect((await req('DELETE', `/admin/permissions/collections/${c}`)).status).toBe(200);
      }
      expect(JSON.stringify([rules().Assignment?.onlyWhile, rules().Envelope?.onlyWhile])).toBe(before);
      const id = await assignment('issued');
      expect409(await put('coach', 'Assignment', id, { status: 'draft' }), /only to "withdrawn"/);
      // Said on purpose through the same door: validated, kept, and in force on the next write.
      const set = await req('PUT', '/admin/permissions/collections/Assignment', {
        onlyWhile: { update: { moves: { status: { issued: { to: ['withdrawn', 'draft'] } } } } }
      });
      expect(set.status).toBe(200);
      expect((await put('coach', 'Assignment', id, { status: 'draft' })).status).toBe(200);
      const bad = await req<{ error: string }>('PUT', '/admin/permissions/collections/Assignment', { onlyWhile: { update: { moves: { status: { a: { to: ['a'] } } } } } });
      expect(bad.status).toBe(400);
      expect(bad.json.error).toMatch(/staying is not a move/);
      expect((await req('PUT', '/admin/permissions/collections/Assignment', { onlyWhile: LOCKED.collections.Assignment.onlyWhile })).status).toBe(200);
      expect(JSON.stringify(rules().Assignment?.onlyWhile)).toBe(JSON.stringify(LOCKED.collections.Assignment.onlyWhile));
    });

    /** AC3's schema half at both permission doors: a `Ticket` whose status is a choice and whose priority is a Number. */
    const ticketMoves = (moves: unknown) => ({ onlyWhile: { update: { moves } } });
    const putTicket = (moves: unknown) => req<{ error: string }>('PUT', '/admin/permissions/collections/Ticket', ticketMoves(moves));
    const ensureTicket = async () => {
      const r = await req('POST', '/admin/schema', {
        action: 'createTable',
        table: 'Ticket',
        columns: [
          { name: 'status', type: 'String' },
          { name: 'title', type: 'String' },
          { name: 'priority', type: 'Number' }
        ],
        checks: [{ field: 'status', oneOf: ['open', 'closed', 'archived'] }]
      });
      expect(r.status).toBe(200);
    };

    it('🔴 AC3, the schema half — a move to a value the choice cannot hold, from one it never has, or on a Number, is a 400 in words at both permission doors, and nothing is saved', async () => {
      await ensureTicket();
      type Config = { collections: Record<string, { onlyWhile?: unknown }> };
      const config = () => (service as unknown as { security: { config: Config } }).security.config;
      const before = JSON.stringify(config());

      const reopened = await putTicket({ status: { open: { to: ['reopened'] } } });
      expect(reopened.status).toBe(400);
      expect(reopened.json.error).toContain('update.moves.status."open".to names "reopened", which "status" cannot hold — its choices are "open", "closed", "archived"');
      const draft = await putTicket({ status: { draft: { to: ['open'] } } });
      expect(draft.status).toBe(400);
      expect(draft.json.error).toContain('"status" is never "draft"');
      const number = await putTicket({ priority: { '1': { to: ['2'] } } });
      expect(number.status).toBe(400);
      expect(number.json.error).toContain('"priority" is a Number; only a choice or text has values that move');

      // The whole-document write reads the same rule against the same schema.
      const whole = JSON.parse(before);
      whole.collections.Ticket = ticketMoves({ status: { open: { to: ['reopened'] } } });
      const doc = await req<{ error: string }>('PUT', '/admin/permissions', whole);
      expect(doc.status).toBe(400);
      expect(doc.json.error).toContain('"reopened", which "status" cannot hold');
      expect(JSON.stringify(config())).toBe(before);

      // Controls: between the choice's own values, on text, and on a field the schema does not declare.
      expect((await putTicket({ status: { open: { to: ['closed'] }, closed: { to: ['archived'] }, '*': { to: [] } } })).status).toBe(200);
      expect((await putTicket({ title: { draft: { to: ['final'] } } })).status).toBe(200);
      expect((await putTicket({ stage: { a: { to: ['b'] } } })).status).toBe(200);
      expect((await req('PUT', '/admin/permissions/collections/Ticket', { onlyWhile: null })).status).toBe(200);
    });

    // ---------------------------------------------------------------- mutants

    it('MUTANT — the schema half never asked: a move to "reopened" is saved, and the AC3 schema case catches it', async () => {
      await ensureTicket();
      const spy = jest.spyOn(model, 'onlyWhileSchemaProblems').mockReturnValue([]);
      try {
        expect((await putTicket({ status: { open: { to: ['reopened'] } } })).status).toBe(200);
      } finally {
        spy.mockRestore();
        expect((await req('PUT', '/admin/permissions/collections/Ticket', { onlyWhile: null })).status).toBe(200);
      }
    });

    it('MUTANT — heldWhile drops the moves: issued → draft goes through, and the "never goes back" case catches it', async () => {
      const real = onlyWhile.heldWhile;
      const spy = jest.spyOn(onlyWhile, 'heldWhile').mockImplementation((c, a, op, fields, values) => {
        const ow = a?.onlyWhile;
        const stripped = ow?.update ? { ...a!, onlyWhile: { ...ow, update: { ...ow.update, moves: undefined } } } : a;
        return real(c, stripped, op, fields, values);
      });
      const id = await assignment('issued');
      try {
        expect((await put('coach', 'Assignment', id, { status: 'draft' })).status).toBe(200);
      } finally {
        spy.mockRestore();
      }
    });

    it('MUTANT — the body’s values never reach the rule: an echo of an unchanged date of birth is refused, and the "same value" case catches it', async () => {
      const real = onlyWhile.heldWhile;
      const spy = jest.spyOn(onlyWhile, 'heldWhile').mockImplementation((c, a, op, fields) => real(c, a, op, fields));
      const id = await make('Person', { name: 'Di', dateOfBirth: '2000-02-02' });
      try {
        expect((await put('ann', 'Person', id, { dateOfBirth: '2000-02-02' })).status).toBe(409);
      } finally {
        spy.mockRestore();
      }
    });

    it('MUTANT — `by` never decided for the caller: the learner issues their own draft, and the "not yours" case catches it', async () => {
      const real = model.onlyWhileFor;
      const spy = jest.spyOn(model, 'onlyWhileFor').mockImplementation((config, collection) => real(config, collection));
      const id = await assignment('draft');
      try {
        expect((await put('ann', 'Assignment', id, { status: 'issued' })).status).toBe(200);
      } finally {
        spy.mockRestore();
      }
    });
  });
}
