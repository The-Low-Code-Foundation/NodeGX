/**
 * Bug P116-S16-INCLUDECLP — `include` reads the TARGET collection under the caller's row ACL only.
 * Its own `find`/`get` rule, and a path rule's narrowing, are never asked (`AdapterFacade.toWire`:
 * `rawFetch(className, value, acl)` with the SOURCE collection's ACL option). Found while counting
 * ONT-012's doors (§4).
 *
 * The case: `Salary` is `get: nobody` for users. Its rows carry no ACL (a public row, the default
 * when `creatorOwns` is off). A user asks for it directly: 403. A user asks for a `Contract` that
 * links to it, with `include=salary`: the salary comes back embedded. `it.failing` until fixed.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { request } from './helpers/http';

jest.setTimeout(60000);

const CONFIG = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'nobody' },
    creatorOwns: false
  },
  collections: { Salary: { permissions: { find: 'nobody', get: 'nobody', create: 'nobody', update: 'nobody', delete: 'nobody' } } },
  functions: {},
  files: { upload: 'authenticated', read: 'public', delete: 'nobody' },
  signup: 'public'
};

describe('P116-S16-INCLUDECLP — include reads a collection its caller may not read', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let session = '';
  let contract = '';
  let salary = '';
  const admin = { authorization: 'Bearer t0k' };
  const req = <T = unknown>(method: string, p: string, body?: unknown, headers: Record<string, string> = admin) =>
    request<T>(base, method, p, { body, headers });

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-includeclp-'));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(CONFIG));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'includeclp', backendName: 'include CLP', authToken: 't0k' });
    base = (await service.start()).listen.url;
    session = (await req<{ sessionToken: string }>('POST', '/users', { username: 'eve', password: 'pw-eve' }, {})).json.sessionToken;
    const table = (name: string, columns: unknown[]) => req('POST', '/admin/schema', { action: 'createTable', table: name, columns });
    await table('Salary', [{ name: 'amount', type: 'Number' }]);
    await table('Contract', [{ name: 'title', type: 'String' }, { name: 'salary', type: 'Pointer', targetClass: 'Salary' }]);
    salary = (await req<{ objectId: string }>('POST', '/classes/Salary', { amount: 91000 })).json.objectId;
    contract = (await req<{ objectId: string }>('POST', '/classes/Contract', { title: 'engineer', salary: { __type: 'Pointer', className: 'Salary', objectId: salary } }))
      .json.objectId;
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('control: the salary itself is refused to the user', async () => {
    expect((await req('GET', `/classes/Salary/${salary}`, undefined, { 'x-parse-session-token': session })).status).toBe(403);
  });

  it.failing('🔴 the salary does not come back embedded in a contract the user may read', async () => {
    const r = await req<{ salary: Record<string, unknown> }>('GET', `/classes/Contract/${contract}?include=salary`, undefined, {
      'x-parse-session-token': session
    });
    expect(r.status).toBe(200);
    expect(r.json.salary.amount).toBeUndefined();
  });
});
