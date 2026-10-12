/**
 * P116 R10 — a link's "when it goes" rule, kept by the backend at delete time, on SQLite and PostgreSQL.
 *
 * Ruled 2026-10-09 (README §9 R10, bug `P116-ONT-003-links`): not a foreign key — the backend keeps
 * it inside the delete, the same on every engine (`@noodl/backend-contract` `targetGoes.ts`, called
 * from `AdapterFacade.rawDelete`). ONT-003's claims grade the rule per world (through the facade's
 * delete, `helpers/facade-deletes.ts`); this file grades what the claims cannot see:
 *
 *   - **every door that deletes**: `/classes` (which a cloud function's Delete Record calls over
 *     loopback), BYOB `/api/:table`, and its `_batch` — a `blocks` refusal is a 409 that says what
 *     links to it on all three, never the doors' old "not found";
 *   - **the plan is read before anything is written**: a refusal two links deep (an account whose
 *     person holds a badge that blocks) leaves the account, the person and the badge as they were;
 *   - **two levels of goes-too**, a link emptied beside them, and rows on another record untouched;
 *   - **a tree and a loop** of goes-too end, the whole tree gone;
 *   - **past a page**: 501 people go with their account (the s11 trap: a reader that stops at a short page);
 *   - **the caller's own record decides**: a caller who may not delete it changes nothing anywhere;
 *   - **the schema route** refuses a rule that could never be kept (400), and `setWhenTargetGoes`
 *     changes it on a collection that has records; `null` takes it away (the old behaviour, measured);
 *   - **after a restart** the rule is still kept (it lives in the declaration, on both engines);
 *   - **a Links field's pairs go with either end** (bug `P116-ONT-003-pairs`): a deleted tag leaves no
 *     post paired with it, a deleted post leaves no pairs of its own, and a post that goes with its
 *     account (goes-too) takes its pairs too.
 *
 * PostgreSQL is skipped when no server answers, as BRG-005's suites are.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { AdapterFacade } from '../src/persistence/AdapterFacade';
import { createAdapter } from '../src/persistence/createAdapter';
import { BackendService } from '../src/service';
import { request } from './helpers/http';

jest.setTimeout(180000);

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
if (!pgReachable && process.env.NODEGX_REQUIRE_PG === '1') throw new Error(`R10: NODEGX_REQUIRE_PG=1 and no PostgreSQL answered at ${ADMIN_URL}.`);

const STAMP = `${process.pid}_${Date.now().toString(36)}`;
let seq = 0;

type Req = <T = unknown>(method: string, p: string, body?: unknown) => Promise<{ status: number; json: T; text: string }>;
interface Backend {
  req: Req;
  restart: () => Promise<void>;
  stop: () => Promise<void>;
}

/** A backend on a fresh database; `restart` stops it and starts another on the same data. */
async function startBackend(engine: 'sqlite' | 'postgres'): Promise<Backend> {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-r10-'));
  fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
  const db = engine === 'postgres' ? `nodegx_r10_${STAMP}_${++seq}` : null;
  if (db) psql(ADMIN_URL, `CREATE DATABASE ${db}`);
  let service: BackendService;
  let base = '';
  const up = async (): Promise<void> => {
    if (db) process.env.NODEGX_STORAGE_URL = ADMIN_URL.replace(/\/[^/?]*(\?|$)/, `/${db}$1`);
    service = new BackendService({ dataDir, port: 0, backendId: 'r10', backendName: 'R10', authToken: 't0k' });
    try {
      base = (await service.start()).listen.url;
    } finally {
      delete process.env.NODEGX_STORAGE_URL;
    }
  };
  const down = async (): Promise<void> => {
    await new Promise((r) => setTimeout(r, 250)); // the audit row, stamped without an await
    await service.stop();
  };
  await up();
  return {
    req: (method, p, body) => request(base, method, p, { body, headers: { authorization: 'Bearer t0k' } }) as never,
    async restart() {
      await down();
      await up();
    },
    async stop() {
      await down();
      fs.rmSync(dataDir, { recursive: true, force: true });
      if (db)
        try {
          psql(ADMIN_URL, `DROP DATABASE IF EXISTS ${db} WITH (FORCE)`);
        } catch {
          /* a leaked test database is not worth failing the run over */
        }
    }
  };
}

const ptr = (className: string, objectId: string) => ({ __type: 'Pointer', className, objectId });
const link = (name: string, targetClass: string, whenTargetGoes?: string, required?: boolean) => ({
  name,
  type: 'Pointer',
  targetClass,
  ...(whenTargetGoes ? { whenTargetGoes } : {}),
  ...(required ? { required: true } : {})
});
const text = (name: string) => ({ name, type: 'String' });

/** The world this file deletes in. Every rule a link can say, and one link that says none. */
const TABLES: Array<{ table: string; columns: unknown[] }> = [
  { table: 'Account', columns: [text('name')] },
  { table: 'Company', columns: [text('name')] },
  { table: 'Person', columns: [text('name'), link('account', 'Account', 'goes-too')] },
  { table: 'Membership', columns: [link('person', 'Person', 'goes-too'), link('company', 'Company', 'blocks')] },
  { table: 'Note', columns: [text('says'), link('about', 'Person', 'stays-unlinked')] },
  { table: 'Badge', columns: [text('name'), link('holder', 'Person', 'blocks')] },
  { table: 'Topic', columns: [text('name'), link('parent', 'Topic', 'goes-too')] },
  { table: 'Mention', columns: [link('person', 'Person')] }
];

for (const engine of ['sqlite', 'postgres'] as const) {
  const suite = engine === 'postgres' && !pgReachable ? describe.skip : describe;
  suite(`R10 — when what a link points at goes, on ${engine}`, () => {
    let b: Backend;
    const make = async (collection: string, data: Record<string, unknown>): Promise<string> => {
      const r = await b.req<{ objectId: string }>('POST', `/classes/${collection}`, data);
      expect([200, 201]).toContain(r.status);
      return r.json.objectId;
    };
    const there = async (collection: string, id: string): Promise<boolean> => (await b.req('GET', `/classes/${collection}/${id}`)).status === 200;
    const fieldOf = async (collection: string, id: string, field: string): Promise<unknown> => (await b.req<Record<string, unknown>>('GET', `/classes/${collection}/${id}`)).json[field];
    const countOf = async (collection: string): Promise<number> =>
      (await b.req<{ count: number }>('POST', `/classes/${collection}`, { _method: 'GET', count: 1, limit: 0 })).json.count;

    beforeAll(async () => {
      b = await startBackend(engine);
      for (const t of TABLES) expect((await b.req('POST', '/admin/schema', { action: 'createTable', ...t })).status).toBe(200);
    });
    afterAll(() => b.stop());

    it('the schema keeps the rule as it was said', async () => {
      const r = await b.req<{ columns: Array<{ name: string; whenTargetGoes?: string }> }>('GET', '/admin/schema/Membership');
      expect(r.json.columns.map((c) => [c.name, c.whenTargetGoes ?? null])).toEqual([
        ['person', 'goes-too'],
        ['company', 'blocks']
      ]);
    });

    it('/classes: an account goes, its people go, their memberships go, a note about them stays without one — and nothing on another account moves', async () => {
      const acme = await make('Company', { name: 'Acme' });
      const a1 = await make('Account', { name: 'one' });
      const a2 = await make('Account', { name: 'two' });
      const ann = await make('Person', { name: 'Ann', account: ptr('Account', a1) });
      const bea = await make('Person', { name: 'Bea', account: ptr('Account', a1) });
      const cy = await make('Person', { name: 'Cy', account: ptr('Account', a2) });
      const m1 = await make('Membership', { person: ptr('Person', ann), company: ptr('Company', acme) });
      const m2 = await make('Membership', { person: ptr('Person', cy), company: ptr('Company', acme) });
      const note = await make('Note', { says: 'called', about: ptr('Person', bea) });
      const mention = await make('Mention', { person: ptr('Person', ann) });

      const r = await b.req('DELETE', `/classes/Account/${a1}`);
      expect(r.status).toBe(200);
      expect([await there('Account', a1), await there('Person', ann), await there('Person', bea), await there('Membership', m1)]).toEqual([false, false, false, false]);
      expect([await there('Account', a2), await there('Person', cy), await there('Membership', m2), await there('Company', acme)]).toEqual([true, true, true, true]);
      expect(await there('Note', note)).toBe(true);
      expect(await fieldOf('Note', note, 'about')).toBeFalsy();
      // A link that says nothing is the old behaviour: it stays, pointing at nothing. The control.
      expect(await fieldOf('Mention', mention, 'person')).toMatchObject({ objectId: ann });
    });

    it('a blocks rule refuses on every door with a 409 that says what links to it, and changes nothing', async () => {
      const co = await make('Company', { name: 'Blocked' });
      const p = await make('Person', { name: 'Dee' });
      const m = await make('Membership', { person: ptr('Person', p), company: ptr('Company', co) });
      const linked = [{ collection: 'Membership', field: 'company', target: 'Company', count: 1 }];

      const classes = await b.req<{ reason: string; linked: unknown; error: string }>('DELETE', `/classes/Company/${co}`);
      expect([classes.status, classes.json.reason, classes.json.linked]).toEqual([409, 'still-linked', linked]);
      expect(classes.json.error).toBe('This Company record cannot be deleted: 1 Membership record links to it by "company". Nothing was deleted.');

      const api = await b.req<{ reason: string; linked: unknown }>('DELETE', `/api/Company/${co}`);
      expect([api.status, api.json.reason, api.json.linked]).toEqual([409, 'still-linked', linked]);

      const batch = await b.req<Array<{ reason?: string; linked?: unknown }> | { results: Array<{ reason?: string; linked?: unknown }> }>('POST', '/api/_batch', {
        operations: [{ method: 'delete', collection: 'Company', objectId: co }]
      });
      const results = Array.isArray(batch.json) ? batch.json : batch.json.results;
      expect([results[0].reason, results[0].linked]).toEqual(['still-linked', linked]);

      expect([await there('Company', co), await there('Membership', m)]).toEqual([true, true]);
      // The membership goes with its person; then the company may go.
      expect((await b.req('DELETE', `/classes/Person/${p}`)).status).toBe(200);
      expect(await there('Membership', m)).toBe(false);
      expect((await b.req('DELETE', `/classes/Company/${co}`)).status).toBe(200);
    });

    it('a refusal two links deep is read before anything is written: the account, the person and the badge stay', async () => {
      const a = await make('Account', { name: 'deep' });
      const p = await make('Person', { name: 'Eve', account: ptr('Account', a) });
      const badge = await make('Badge', { name: 'gold', holder: ptr('Person', p) });
      const r = await b.req<{ linked: unknown; error: string }>('DELETE', `/classes/Account/${a}`);
      expect(r.status).toBe(409);
      expect(r.json.linked).toEqual([{ collection: 'Badge', field: 'holder', target: 'Person', count: 1 }]);
      expect(r.json.error).toContain('a Person record that would go with it');
      expect([await there('Account', a), await there('Person', p), await there('Badge', badge)]).toEqual([true, true, true]);
    });

    it('a tree goes from its root, and a loop of goes-too ends', async () => {
      const root = await make('Topic', { name: 'root' });
      const child = await make('Topic', { name: 'child', parent: ptr('Topic', root) });
      const grand = await make('Topic', { name: 'grand', parent: ptr('Topic', child) });
      const other = await make('Topic', { name: 'other' });
      expect((await b.req('DELETE', `/classes/Topic/${root}`)).status).toBe(200);
      expect([await there('Topic', root), await there('Topic', child), await there('Topic', grand), await there('Topic', other)]).toEqual([false, false, false, true]);

      const t1 = await make('Topic', { name: 't1' });
      const t2 = await make('Topic', { name: 't2', parent: ptr('Topic', t1) });
      expect((await b.req('PUT', `/classes/Topic/${t1}`, { parent: ptr('Topic', t2) })).status).toBe(200);
      expect((await b.req('DELETE', `/classes/Topic/${t1}`)).status).toBe(200);
      expect([await there('Topic', t1), await there('Topic', t2)]).toEqual([false, false]);
    });

    it('past a page: 501 people go with their account', async () => {
      const a = await make('Account', { name: 'big' });
      const before = await countOf('Person');
      const ops = Array.from({ length: 501 }, (_, i) => ({ method: 'create', collection: 'Person', data: { name: `p${i}`, account: ptr('Account', a) } }));
      expect((await b.req('POST', '/api/_batch', { operations: ops })).status).toBe(200);
      expect(await countOf('Person')).toBe(before + 501);
      expect((await b.req('DELETE', `/classes/Account/${a}`)).status).toBe(200);
      expect(await countOf('Person')).toBe(before);
    });

    it('the schema route refuses a rule that could never be kept, and makes nothing', async () => {
      const cases: Array<[unknown, RegExp]> = [
        [{ name: 'x', type: 'String', whenTargetGoes: 'goes-too' }, /only a link to one record/],
        [link('x', 'Account', 'cascade'), /must be one of goes-too, stays-unlinked, blocks/],
        [link('x', 'Account', 'stays-unlinked', true), /is required, so it cannot stay without one/]
      ];
      for (const [column, says] of cases) {
        const made = await b.req<{ error: string }>('POST', '/admin/schema', { action: 'createTable', table: 'Refused', columns: [column] });
        expect([made.status, says.test(made.json.error)]).toEqual([400, true]);
        const added = await b.req<{ error: string }>('POST', '/admin/schema', { action: 'addColumn', table: 'Note', column });
        expect([added.status, says.test(added.json.error)]).toEqual([400, true]);
      }
      expect((await b.req('GET', '/admin/schema/Refused')).status).toBe(404);
    });

    it('setWhenTargetGoes changes the rule over records; null takes it away, and the link is left pointing at nothing (the old way)', async () => {
      const co = await make('Company', { name: 'Changes' });
      const p = await make('Person', { name: 'Fay' });
      const m = await make('Membership', { person: ptr('Person', p), company: ptr('Company', co) });
      expect((await b.req('DELETE', `/classes/Company/${co}`)).status).toBe(409);

      const refused = await b.req<{ error: string }>('POST', '/admin/schema', { action: 'setWhenTargetGoes', table: 'Membership', columns: { company: 'stays-unlinked', nope: 'blocks' } });
      expect(refused.status).toBe(400);
      expect((await b.req('POST', '/admin/schema', { action: 'setWhenTargetGoes', table: 'Note', columns: { says: 'blocks' } })).status).toBe(400);

      expect((await b.req('POST', '/admin/schema', { action: 'setWhenTargetGoes', table: 'Membership', columns: { company: 'goes-too' } })).status).toBe(200);
      expect((await b.req('DELETE', `/classes/Company/${co}`)).status).toBe(200);
      expect(await there('Membership', m)).toBe(false);

      const co2 = await make('Company', { name: 'Unruled' });
      const m2 = await make('Membership', { person: ptr('Person', p), company: ptr('Company', co2) });
      expect((await b.req('POST', '/admin/schema', { action: 'setWhenTargetGoes', table: 'Membership', columns: { company: null } })).status).toBe(200);
      const r = await b.req<{ columns: Array<{ name: string; whenTargetGoes?: string }> }>('GET', '/admin/schema/Membership');
      expect(r.json.columns.find((c) => c.name === 'company')!.whenTargetGoes).toBeUndefined();
      expect((await b.req('DELETE', `/classes/Company/${co2}`)).status).toBe(200);
      expect(await fieldOf('Membership', m2, 'company')).toMatchObject({ objectId: co2 });
      expect((await b.req('POST', '/admin/schema', { action: 'setWhenTargetGoes', table: 'Membership', columns: { company: 'blocks' } })).status).toBe(200);
    });

    it('after a restart the rule is still kept', async () => {
      await b.restart();
      const co = await make('Company', { name: 'Restarted' });
      const p = await make('Person', { name: 'Gil' });
      await make('Membership', { person: ptr('Person', p), company: ptr('Company', co) });
      expect((await b.req('DELETE', `/classes/Company/${co}`)).status).toBe(409);
      expect((await b.req('DELETE', `/classes/Person/${p}`)).status).toBe(200);
      expect((await b.req('DELETE', `/classes/Company/${co}`)).status).toBe(200);
    });
  });

  // The facade alone: a Links field's pairs go with the record at either end (bug P116-ONT-003-pairs).
  suite(`P116-ONT-003-pairs — a deleted record's pairs go with it, on ${engine}`, () => {
    it('a tag goes, a post goes, a post goes with its account: no pair names any of them after', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-r10-pairs-'));
      const db = engine === 'postgres' ? `nodegx_r10p_${STAMP}_${++seq}` : null;
      if (db) psql(ADMIN_URL, `CREATE DATABASE ${db}`);
      const h = await createAdapter({ dataDir: dir, ...(db ? { storageUrl: ADMIN_URL.replace(/\/[^/?]*(\?|$)/, `/${db}$1`) } : {}) });
      try {
        const f = new AdapterFacade(h.adapter);
        const sm = f.schemaManager;
        sm.createTable({ name: 'Account', columns: [{ name: 'name', type: 'String' }] });
        sm.createTable({ name: 'Tag', columns: [{ name: 'name', type: 'String' }] });
        sm.createTable({
          name: 'Post',
          columns: [
            { name: 'tags', type: 'Relation', targetClass: 'Tag' },
            { name: 'account', type: 'Pointer', targetClass: 'Account', whenTargetGoes: 'goes-too' }
          ]
        });
        const id = async (c: string, data: Record<string, unknown> = {}): Promise<string> => String((await f.rawCreate(c, data)).objectId);
        const a = await id('Account');
        const [t1, t2] = [await id('Tag'), await id('Tag')];
        const [p1, p2, p3] = [await id('Post'), await id('Post'), await id('Post', { account: ptr('Account', a) })];
        for (const [p, t] of [[p1, t1], [p2, t1], [p2, t2], [p3, t2]]) await f.addRelation('Post', p, 'tags', t);
        const tagsOf = (p: string): string[] => [...(sm.getRelatedIds('Post', p, 'tags') as string[])].sort();
        // Read before: the pairs are there (the control for every read after).
        expect([tagsOf(p1), tagsOf(p2), tagsOf(p3)]).toEqual([[t1], [t1, t2].sort(), [t2]]);

        await f.rawDelete('Tag', t1);
        expect([tagsOf(p1), tagsOf(p2)]).toEqual([[], [t2]]);
        expect(sm.getRelationOwners('Post', 'tags', t1)).toEqual([]);

        await f.rawDelete('Post', p2);
        expect(tagsOf(p2)).toEqual([]);
        expect(sm.getRelationOwners('Post', 'tags', t2)).toEqual([p3]);

        await f.rawDelete('Account', a);
        expect(await f.rawCount('Post', { objectId: p3 })).toBe(0);
        expect([tagsOf(p3), sm.getRelationOwners('Post', 'tags', t2)]).toEqual([[], []]);
        // The tag itself stays: a pair going is not its far end going.
        expect(await f.rawCount('Tag', { objectId: t2 })).toBe(1);
      } finally {
        await h.adapter.disconnect();
        fs.rmSync(dir, { recursive: true, force: true });
        if (db)
          try {
            psql(ADMIN_URL, `DROP DATABASE IF EXISTS ${db} WITH (FORCE)`);
          } catch {
            /* best effort */
          }
      }
    });
  });

  // The facade alone: a caller whose ACL does not reach the record changes nothing anywhere.
  suite(`R10 — the caller's own record decides, on ${engine}`, () => {
    it('a delete the caller may not make cascades nothing', async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-r10-acl-'));
      const db = engine === 'postgres' ? `nodegx_r10a_${STAMP}_${++seq}` : null;
      if (db) psql(ADMIN_URL, `CREATE DATABASE ${db}`);
      const h = await createAdapter({ dataDir: dir, ...(db ? { storageUrl: ADMIN_URL.replace(/\/[^/?]*(\?|$)/, `/${db}$1`) } : {}) });
      try {
        const f = new AdapterFacade(h.adapter);
        f.schemaManager.createTable({ name: 'Account', columns: [{ name: 'name', type: 'String' }] });
        f.schemaManager.createTable({ name: 'Person', columns: [{ name: 'account', type: 'Pointer', targetClass: 'Account', whenTargetGoes: 'goes-too' }] });
        const a = await f.rawCreate('Account', { name: 'ann’s', ACL: { ann: { read: true, write: true } } });
        const p = await f.rawCreate('Person', { account: ptr('Account', String(a.objectId)) });
        await expect(f.rawDelete('Account', String(a.objectId), { access: 'write', keys: ['bob'] })).rejects.toThrow();
        expect([await f.rawCount('Account', { objectId: a.objectId }), await f.rawCount('Person', { objectId: p.objectId })]).toEqual([1, 1]);
        // The control: the owner's own delete takes the person with it.
        await f.rawDelete('Account', String(a.objectId), { access: 'write', keys: ['ann'] });
        expect([await f.rawCount('Account', { objectId: a.objectId }), await f.rawCount('Person', { objectId: p.objectId })]).toEqual([0, 0]);
      } finally {
        await h.adapter.disconnect();
        fs.rmSync(dir, { recursive: true, force: true });
        if (db)
          try {
            psql(ADMIN_URL, `DROP DATABASE IF EXISTS ${db} WITH (FORCE)`);
          } catch {
            /* best effort */
          }
      }
    });
  });
}
