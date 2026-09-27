/**
 * P90 SYN-003 — a record created with its own objectId, at both doors.
 *
 * Before this, a caller-sent `objectId` was the id WRITTEN while the adapter
 * read the row back by the one it generated, so the row existed and the
 * handler got `null`: `POST /classes` answered 500 (on `record.objectId`) and
 * `POST /api` answered 201 with an empty body. A second create with the same id
 * was a raw 500 from SQLite's UNIQUE constraint.
 *
 * The adapter semantics are pinned in `noodl-runtime`'s
 * `LocalSQLAdapter.clientObjectId.test.js`; this file pins what survives the
 * wire: 201 with the id kept, 409 (Parse's DUPLICATE_VALUE, 137) for a taken
 * one with the first record untouched, and 400 for a malformed one with nothing
 * written — with a create that sends no id beside them as the control.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';

import { adminHeaders, ParseQueryResult, ParseRecord, request } from './helpers/http';

jest.setTimeout(30000);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('SYN-003 — a record created with its own objectId', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;

  const req = <T = unknown>(method: string, pathName: string, body?: unknown) =>
    request<T>(base, method, pathName, { body, headers: adminHeaders(dataDir) });

  const count = async (collection: string) =>
    (await req<ParseQueryResult>('GET', `/classes/${collection}?count=1&limit=0`)).json.count;

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'syn003-http-'));
    service = new BackendService({ dataDir, port: 0, backendId: 'backend_syn003', backendName: 'SYN-003' });
    const started = await service.start();
    base = started.listen.url;
    expect(started.persistence.status.persistent).toBe(true);
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  describe('POST /classes/:collection', () => {
    it('NEGATIVE CONTROL: a create with no objectId is 201 with a generated one', async () => {
      const { status, json } = await req<ParseRecord>('POST', '/classes/Task', { title: 'generated' });
      expect(status).toBe(201);
      expect(json.objectId).toMatch(UUID);
    });

    it('a create that sends its own objectId is 201 and keeps it', async () => {
      const { status, json } = await req<ParseRecord>('POST', '/classes/Task', {
        objectId: 'client-made-1',
        title: 'A'
      });
      expect(status).toBe(201);
      expect(json.objectId).toBe('client-made-1');

      const fetched = await req<ParseRecord>('GET', '/classes/Task/client-made-1');
      expect(fetched.status).toBe(200);
      expect(fetched.json.title).toBe('A');
    });

    it('a taken objectId is 409 with code 137, and the first record is unchanged', async () => {
      const before = await count('Task');
      const { status, json } = await req<{ code?: number; error: string }>('POST', '/classes/Task', {
        objectId: 'client-made-1',
        title: 'overwrite?'
      });
      expect(status).toBe(409);
      expect(json.code).toBe(137);

      const fetched = await req<ParseRecord>('GET', '/classes/Task/client-made-1');
      expect(fetched.json.title).toBe('A');
      expect(await count('Task')).toBe(before);
    });

    it('a malformed objectId is 400, and nothing is written', async () => {
      const before = await count('Task');
      const { status } = await req('POST', '/classes/Task', { objectId: 'has/slash', title: 'bad' });
      expect(status).toBe(400);
      expect(await count('Task')).toBe(before);
    });
  });

  describe('POST /api/:table', () => {
    it('NEGATIVE CONTROL: a create with no objectId is 201 with the record', async () => {
      const { status, json } = await req<ParseRecord>('POST', '/api/Note', { body: 'generated' });
      expect(status).toBe(201);
      expect(json.objectId).toMatch(UUID);
    });

    it('a create that sends its own objectId is 201 with the record under that id', async () => {
      const { status, json } = await req<ParseRecord>('POST', '/api/Note', { objectId: 'rest-made-1', body: 'A' });
      expect(status).toBe(201);
      expect(json).not.toBeNull();
      expect(json.objectId).toBe('rest-made-1');
      expect(json.body).toBe('A');
    });

    it('a taken objectId is 409', async () => {
      const { status } = await req('POST', '/api/Note', { objectId: 'rest-made-1', body: 'again' });
      expect(status).toBe(409);
    });
  });
});
