/**
 * P116 ONT-012 AC1 (R-b) — *"once a bill is sent, nobody changes its amount; we can still mark it
 * paid."* Kept by the backend, on SQLite and PostgreSQL, over real sockets on a LOCKED backend.
 *
 * `collections.Bill.onlyWhile` names the condition on the record's own values before the change.
 * The facade ANDs it into the write itself, so a sent bill is refused at every door a person's
 * write takes (PUT, an increment, a relation-only update, the upsert, BYOB PUT and DELETE, the
 * batch, DELETE), with a 409 in the rule's own words and the record unchanged. A change to the
 * `except` fields alone goes through. A row the caller may not write still answers 404, never 409.
 * The admin credential is not bound. Then the mutant: a facade that drops the condition lets the
 * sent bill change, and the case that guards it says so.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as onlyWhile from '../src/persistence/onlyWhile';
import { validateSecurityConfig } from '../src/security/model';
import { BackendService } from '../src/service';
import { request } from './helpers/http';

jest.setTimeout(120000);

const SAYS = 'A bill can be changed only while it is a draft.';

const LOCKED = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'authenticated' },
    creatorOwns: false
  },
  collections: {
    Bill: {
      onlyWhile: {
        update: { where: { status: 'draft' }, except: ['paidOn'], says: SAYS },
        delete: { where: { status: 'draft' } }
      }
    }
  },
  functions: {},
  files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
  signup: 'public'
};

describe('ONT-012 — the validator', () => {
  const withRule = (onlyWhileValue: unknown, collection = 'Bill') => {
    const cfg = JSON.parse(JSON.stringify(LOCKED));
    cfg.collections = { [collection]: { onlyWhile: onlyWhileValue } };
    return validateSecurityConfig(cfg).join(' | ');
  };

  it('the locked config is valid', () => {
    expect(validateSecurityConfig(LOCKED)).toEqual([]);
  });

  it.each([
    [{ create: { where: { status: 'draft' } } }, /a record being made has none yet/],
    [{ update: { where: {} } }, /where is empty/],
    [{ update: { where: 'draft' } }, /where must be an object/],
    [{ update: { where: { $path: {} } } }, /may not use \$path/],
    [{ update: { where: { $or: [{ $relatedTo: {} }] } } }, /may not use \$relatedTo/],
    [{ delete: { where: { status: 'draft' }, except: ['paidOn'] } }, /nothing can be excepted/],
    [{ update: { where: { status: 'draft' }, except: [] } }, /non-empty list of field names/],
    [{ update: { where: { status: 'draft' }, when: 'now' } }, /unknown key "when"/],
    [{ update: { where: { status: 'draft' }, says: '  ' } }, /says must be a sentence/],
    [{}, /is empty/]
  ])('refuses %j', (value, message) => {
    expect(withRule(value)).toMatch(message);
  });

  it('refuses it on a system collection, like every collection entry', () => {
    expect(withRule({ update: { where: { status: 'draft' } } }, '_User')).toMatch(/system collections/);
  });
});

interface Signup {
  objectId: string;
  sessionToken: string;
}
type Row = Record<string, unknown>;

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
const DB_NAME = `nodegx_ont012_${process.pid}_${Date.now().toString(36)}`;
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
  suite(`ONT-012 AC1 — only while a draft, on ${engine.name}`, () => {
    let dataDir: string;
    let service: BackendService;
    let base: string;
    let previousEnv: string | undefined;
    const admin = { authorization: 'Bearer t0k' };
    const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = admin) =>
      request<T>(base, method, p, { body, headers });
    const asUser = (u: Signup) => ({ 'x-parse-session-token': u.sessionToken });
    const users: Record<string, Signup> = {};
    const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });

    /** A bill ann may write and everyone may read. */
    const bill = async (status: string, amount = 100): Promise<string> => {
      const r = await req<{ objectId: string }>(
        'POST',
        '/classes/Bill',
        { status, amount, ACL: { [users.ann.objectId]: { read: true, write: true }, '*': { read: true } } },
        asUser(users.ann)
      );
      expect(r.status).toBe(201);
      return r.json.objectId;
    };
    const held = async (id: string): Promise<Row> => (await req<Row>('GET', `/classes/Bill/${id}`)).json;
    const expectSettled = (r: { status: number; json: unknown }, words = SAYS) => {
      expect(r.status).toBe(409);
      expect(r.json).toMatchObject({ error: words, reason: 'not-while', collection: 'Bill' });
    };

    beforeAll(async () => {
      if (engine.storageUrl) psql(ADMIN_URL, `CREATE DATABASE "${DB_NAME}"`);
      previousEnv = process.env.NODEGX_STORAGE_URL;
      if (engine.storageUrl) process.env.NODEGX_STORAGE_URL = engine.storageUrl;
      else delete process.env.NODEGX_STORAGE_URL;
      dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-ont012-'));
      fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED));
      fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
      service = new BackendService({ dataDir, port: 0, backendId: 'ont012', backendName: 'ONT-012', authToken: 't0k' });
      base = (await service.start()).listen.url;
      for (const name of ['ann', 'bob']) {
        const r = await req<Signup>('POST', '/users', { username: name, password: `pw-${name}` }, {});
        expect(r.status).toBe(201);
        users[name] = r.json;
      }
      const table = (name: string, columns: unknown[]) => req('POST', '/admin/schema', { action: 'createTable', table: name, columns });
      expect((await table('Tag', [{ name: 'name', type: 'String' }])).status).toBe(200);
      expect(
        (
          await table('Bill', [
            { name: 'status', type: 'String' },
            { name: 'amount', type: 'Number' },
            { name: 'paidOn', type: 'String' },
            { name: 'ref', type: 'String' },
            { name: 'tags', type: 'Relation', targetClass: 'Tag' }
          ])
        ).status
      ).toBe(200);
      expect((await req('POST', '/admin/schema', { action: 'setIndexes', table: 'Bill', indexes: [{ fields: ['ref'], unique: true }] })).status).toBe(200);
    });

    afterAll(async () => {
      await service.stop();
      if (previousEnv === undefined) delete process.env.NODEGX_STORAGE_URL;
      else process.env.NODEGX_STORAGE_URL = previousEnv;
      fs.rmSync(dataDir, { recursive: true, force: true });
    });

    it('a draft changes, and the change that sends it goes through', async () => {
      const id = await bill('draft');
      expect((await req('PUT', `/classes/Bill/${id}`, { amount: 120 }, asUser(users.ann))).status).toBe(200);
      expect((await req('PUT', `/classes/Bill/${id}`, { status: 'sent' }, asUser(users.ann))).status).toBe(200);
      expect(await held(id)).toMatchObject({ status: 'sent', amount: 120 });
    });

    it('🔴 a sent bill is refused on PUT, in the rule’s words, and is unchanged', async () => {
      const id = await bill('sent');
      expectSettled(await req('PUT', `/classes/Bill/${id}`, { amount: 1 }, asUser(users.ann)));
      expect(await held(id)).toMatchObject({ status: 'sent', amount: 100 });
    });

    it('marking it paid (the `except` field alone) goes through; with the amount beside it, it does not', async () => {
      const id = await bill('sent');
      expect((await req('PUT', `/classes/Bill/${id}`, { paidOn: '2026-10-10' }, asUser(users.ann))).status).toBe(200);
      expectSettled(await req('PUT', `/classes/Bill/${id}`, { paidOn: '2026-10-11', amount: 1 }, asUser(users.ann)));
      expect(await held(id)).toMatchObject({ paidOn: '2026-10-10', amount: 100 });
    });

    it('an increment, and a relation-only update, are held the same way', async () => {
      const id = await bill('sent');
      expectSettled(await req('PUT', `/classes/Bill/${id}`, { amount: { __op: 'Increment', amount: 5 } }, asUser(users.ann)));
      const tag = (await req<{ objectId: string }>('POST', '/classes/Tag', { name: 'late' })).json.objectId;
      const relate = { tags: { __op: 'AddRelation', objects: [ptr('Tag', tag)] } };
      expectSettled(await req('PUT', `/classes/Bill/${id}`, relate, asUser(users.ann)));
      const draft = await bill('draft');
      expect((await req('PUT', `/classes/Bill/${draft}`, relate, asUser(users.ann))).status).toBe(200);
      expect(await held(id)).toMatchObject({ amount: 100 });
    });

    it('the upsert, BYOB PUT and the batch are held the same way', async () => {
      const id = await bill('sent');
      expect((await req('PUT', `/classes/Bill/${id}`, { ref: `R-${id}` }, admin)).status).toBe(200);
      const upsert = await req('POST', '/classes/Bill', { ref: `R-${id}`, amount: 2 }, { ...asUser(users.ann), 'x-nodegx-upsert': 'ref' });
      expectSettled(upsert);
      expectSettled(await req('PUT', `/api/Bill/${id}`, { amount: 3 }, asUser(users.ann)));
      const batch = await req<{ results: Row[] }>(
        'POST',
        '/api/_batch',
        { operations: [{ method: 'save', collection: 'Bill', objectId: id, data: { amount: 4 } }] },
        asUser(users.ann)
      );
      expect(batch.status).toBe(200);
      expect(batch.json.results[0]).toMatchObject({ error: SAYS, reason: 'not-while' });
      expect(await held(id)).toMatchObject({ amount: 100 });
    });

    it('a sent bill is not deleted (DELETE, BYOB, batch); a draft is', async () => {
      const id = await bill('sent');
      const deleteWords = /can be deleted only while status is "draft"/;
      const one = await req<{ error: string }>('DELETE', `/classes/Bill/${id}`, undefined, asUser(users.ann));
      expect(one.status).toBe(409);
      expect(one.json.error).toMatch(deleteWords);
      expect((await req('DELETE', `/api/Bill/${id}`, undefined, asUser(users.ann))).status).toBe(409);
      const batch = await req<{ results: Array<{ error: string }> }>(
        'POST',
        '/api/_batch',
        { operations: [{ method: 'delete', collection: 'Bill', objectId: id }] },
        asUser(users.ann)
      );
      expect(batch.json.results[0].error).toMatch(deleteWords);
      expect((await req('GET', `/classes/Bill/${id}`)).status).toBe(200);
      const draft = await bill('draft');
      expect((await req('DELETE', `/classes/Bill/${draft}`, undefined, asUser(users.ann))).status).toBe(200);
    });

    it('🔴 a row the caller may not write is still 404, never 409 — the rule says nothing about other people’s rows', async () => {
      const id = await bill('sent');
      expect((await req('GET', `/classes/Bill/${id}`, undefined, asUser(users.bob))).status).toBe(200);
      expect((await req('PUT', `/classes/Bill/${id}`, { amount: 1 }, asUser(users.bob))).status).toBe(404);
      expect((await req('DELETE', `/classes/Bill/${id}`, undefined, asUser(users.bob))).status).toBe(404);
    });

    it('the admin credential is not bound (a function, which runs as admin, is how an amend is made)', async () => {
      const id = await bill('sent');
      expect((await req('PUT', `/classes/Bill/${id}`, { amount: 7 })).status).toBe(200);
      expect(await held(id)).toMatchObject({ amount: 7 });
    });

    it('🔴 AC5 — the manager saving the collection’s permissions, or reverting them to the defaults, keeps the rule', async () => {
      const rule = () => (service as unknown as { security: { config: { collections: Record<string, { onlyWhile?: unknown }> } } }).security.config.collections.Bill?.onlyWhile;
      const before = JSON.stringify(rule());
      // What the permissions page sends: the matrix and the switch, and nothing it does not draw.
      const put = await req('PUT', '/admin/permissions/collections/Bill', { permissions: { update: 'authenticated' }, creatorOwns: false });
      expect(put.status).toBe(200);
      expect(JSON.stringify(rule())).toBe(before);
      expect((await req('DELETE', '/admin/permissions/collections/Bill')).status).toBe(200);
      expect(JSON.stringify(rule())).toBe(before);
      const id = await bill('sent');
      expectSettled(await req('PUT', `/classes/Bill/${id}`, { amount: 1 }, asUser(users.ann)));
      // Said on purpose: `onlyWhile` through the same door, and `null` takes it away.
      const set = await req('PUT', '/admin/permissions/collections/Bill', { onlyWhile: LOCKED.collections.Bill.onlyWhile });
      expect(set.status).toBe(200);
      expect((await req('PUT', '/admin/permissions/collections/Bill', { onlyWhile: null })).status).toBe(200);
      expect(rule()).toBeUndefined();
      expect((await req('PUT', `/classes/Bill/${id}`, { amount: 1 }, asUser(users.ann))).status).toBe(200);
      expect((await req('PUT', '/admin/permissions/collections/Bill', { onlyWhile: LOCKED.collections.Bill.onlyWhile })).status).toBe(200);
      expect(JSON.stringify(rule())).toBe(before);
    });

    it('MUTANT — a facade that drops the condition lets the sent bill change: the PUT case is what catches it', async () => {
      const id = await bill('sent');
      const spy = jest.spyOn(onlyWhile, 'heldWhile').mockImplementation((_c, acl) => ({ acl }));
      try {
        const r = await req('PUT', `/classes/Bill/${id}`, { amount: 1 }, asUser(users.ann));
        expect(r.status).toBe(200);
      } finally {
        spy.mockRestore();
      }
      expect(await held(id)).toMatchObject({ amount: 1 });
    });
  });
}
