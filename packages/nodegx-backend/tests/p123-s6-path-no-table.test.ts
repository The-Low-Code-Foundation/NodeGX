/**
 * P123-S6-PATHNOTABLE — a privacy rule whose path goes through a collection that has no rows yet reaches no one, in
 * silence, instead of throwing in the SQL.
 *
 * The case: "the person who made a note, or a moderator, may change it", before the first moderator is appointed.
 * The Moderator table does not exist until a row is written, and every read and write the rule decided threw inside
 * the SQL builder: the answer was right (nobody let in) but the server log read `LocalSQLAdapter.save error` with a
 * stack, so a person road-testing their rules on a fresh backend saw a crash where nothing went wrong.
 *
 * A path a person writes into their own query (`where: {$path}`) through a collection that does not exist still
 * says so: only a rule's narrowing reaches no rows.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';

jest.setTimeout(120000);

// Both engines, as P116-S17-DOTTEDFILTER: the empty select a rule's path becomes is SQL both must read.
const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
const DB_NAME = `nodegx_pathnotable_${process.pid}_${Date.now().toString(36)}`;
const psql = (url: string, sql: string): void =>
  void execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { stdio: 'ignore' });
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

const running: BackendService[] = [];
afterAll(async () => {
  for (const svc of running) await svc.stop();
});

interface Person {
  objectId: string;
  sessionToken: string;
}

let base = '';
let admin = '';
let ada: Person;
let bea: Person;
let noteId = '';
let previousEnv: string | undefined;

async function call(method: string, p: string, body?: unknown, auth?: { session?: string; admin?: boolean }) {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-parse-application-id': 'p123' };
  if (auth?.session) headers['x-parse-session-token'] = auth.session;
  if (auth?.admin) headers.authorization = `Bearer ${admin}`;
  const res = await fetch(base + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  return { status: res.status, json };
}

const MODERATOR_PATH = {
  path: {
    hops: [
      { from: 'Moderator', by: 'user' },
      { follow: 'note', to: 'Note' }
    ],
    maxDepth: 2
  }
};

/** What the backend wrote to the console while `fn` ran. */
async function logged<T>(fn: () => Promise<T>): Promise<{ result: T; lines: string[] }> {
  const lines: string[] = [];
  const spies = (['error', 'warn'] as const).map((level) =>
    jest.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      lines.push(args.map((a) => (a instanceof Error ? a.message : String(a))).join(' '));
    })
  );
  try {
    return { result: await fn(), lines };
  } finally {
    for (const spy of spies) spy.mockRestore();
  }
}

for (const engine of engines) {
  const suite = engine.available ? describe : describe.skip;
  suite(`on ${engine.name}`, () => {
    beforeAll(async () => {
      if (engine.storageUrl) psql(ADMIN_URL, `CREATE DATABASE "${DB_NAME}"`);
      previousEnv = process.env.NODEGX_STORAGE_URL;
      if (engine.storageUrl) process.env.NODEGX_STORAGE_URL = engine.storageUrl;
      else delete process.env.NODEGX_STORAGE_URL;
      const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p123-pathnotable-'));
      fs.writeFileSync(
        path.join(dataDir, 'security.json'),
        JSON.stringify({
          version: 1,
          devOpen: false,
          defaults: {
            permissions: {
              find: 'authenticated',
              get: 'authenticated',
              create: 'authenticated',
              update: 'authenticated',
              delete: 'authenticated'
            },
            creatorOwns: true
          },
          collections: {
            Note: {
              creatorOwns: false,
              permissions: {
                find: ['creator', MODERATOR_PATH],
                get: ['creator', MODERATOR_PATH],
                create: 'authenticated',
                update: ['creator', MODERATOR_PATH],
                delete: ['creator', MODERATOR_PATH]
              }
            },
            Board: {
              creatorOwns: false,
              permissions: {
                find: 'authenticated',
                get: 'authenticated',
                create: 'authenticated',
                update: 'authenticated',
                delete: 'authenticated'
              }
            },
            Moderator: {
              creatorOwns: false,
              permissions: {
                find: 'authenticated',
                get: 'authenticated',
                create: 'nobody',
                update: 'nobody',
                delete: 'nobody'
              }
            }
          },
          functions: {},
          files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
          signup: 'public'
        })
      );
      const svc = new BackendService({
        dataDir,
        port: 0,
        backendId: 'p123-pathnotable',
        backendName: 'P123 path no table'
      });
      running.push(svc);
      base = (await svc.start()).listen.url;
      admin = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken;
      const signUp = async (name: string): Promise<Person> => {
        const r = await call('POST', '/users', {
          username: name,
          password: `pw-${name}-123`,
          email: `${name}@p123.test`
        });
        expect(r.status).toBe(201);
        return r.json;
      };
      ada = await signUp('ada');
      bea = await signUp('bea');
      const note = await call('POST', '/classes/Note', { text: 'ada wrote this' }, { session: ada.sessionToken });
      expect(note.status).toBe(201);
      noteId = note.json.objectId;
      const board = await call('POST', '/classes/Board', { title: 'a board' }, { session: ada.sessionToken });
      expect(board.status).toBe(201);
    });

    describe('P123-S6-PATHNOTABLE — before the first moderator, the moderator path reaches no one, quietly', () => {
      it('someone else is refused every way, and nothing is logged as an error', async () => {
        const { result, lines } = await logged(async () => ({
          find: await call('GET', '/classes/Note', undefined, { session: bea.sessionToken }),
          get: await call('GET', `/classes/Note/${noteId}`, undefined, { session: bea.sessionToken }),
          update: await call('PUT', `/classes/Note/${noteId}`, { text: 'bea was here' }, { session: bea.sessionToken }),
          del: await call('DELETE', `/classes/Note/${noteId}`, undefined, { session: bea.sessionToken })
        }));
        expect(result.find.status).toBe(200);
        expect(result.find.json.results).toEqual([]);
        expect(result.get.status).toBe(404);
        expect(result.update.status).toBe(404);
        expect(result.del.status).toBe(404);
        expect(lines.filter((l) => /LocalSQLAdapter|no such collection/.test(l))).toEqual([]);
      });

      it('the person who made it still reads and changes it', async () => {
        const find = await call('GET', '/classes/Note', undefined, { session: ada.sessionToken });
        expect(find.json.results.map((r: { objectId: string }) => r.objectId)).toEqual([noteId]);
        const update = await call(
          'PUT',
          `/classes/Note/${noteId}`,
          { text: 'ada again' },
          { session: ada.sessionToken }
        );
        expect(update.status).toBe(200);
      });

      it('a path a person writes into a query through a collection that does not exist is still refused, by name', async () => {
        const where = encodeURIComponent(
          JSON.stringify({
            $path: { from: { collection: 'Nowhere' }, hops: [{ follow: 'board', to: 'Board' }], maxDepth: 1 }
          })
        );
        const { result } = await logged(() =>
          call('GET', `/classes/Board?where=${where}`, undefined, { session: ada.sessionToken })
        );
        expect(result.status).toBeGreaterThanOrEqual(400);
        expect(result.json.error).toContain('The path goes through "Nowhere", and there is no such collection');
      });

      it('once a moderator is appointed, the path lets them in', async () => {
        const appointed = await call(
          'POST',
          '/classes/Moderator',
          { user: { __type: 'Pointer', className: '_User', objectId: bea.objectId }, note: noteId },
          { admin: true }
        );
        expect(appointed.status).toBe(201);
        const get = await call('GET', `/classes/Note/${noteId}`, undefined, { session: bea.sessionToken });
        expect(get.status).toBe(200);
        const update = await call(
          'PUT',
          `/classes/Note/${noteId}`,
          { text: 'moderated' },
          { session: bea.sessionToken }
        );
        expect(update.status).toBe(200);
      });
    });

    afterAll(async () => {
      for (const svc of running.splice(0)) await svc.stop();
      if (previousEnv === undefined) delete process.env.NODEGX_STORAGE_URL;
      else process.env.NODEGX_STORAGE_URL = previousEnv;
    });
  });
}
