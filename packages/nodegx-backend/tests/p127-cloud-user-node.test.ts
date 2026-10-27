/**
 * P127-BKO006-CLOUDUSERNODE — a User node inside a cloud function reads the signed-in caller.
 *
 * BKO-006's repair shop: a function checked "is the caller staff?" with a User node, as the examples do. Its Fetch
 * failed `Not found: GET /users/<id>`: the cloud runtime's user service reads the caller by id with the app's key, and
 * the backend served `GET /users/me` and `PUT /users/:id` but no `GET /users/:id`. The agent worked around it with
 * Get User Roles. The route is now the same read as `GET /classes/_User/:id`, through the same rules.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { httpClient } from './helpers/http';

jest.setTimeout(30000);

/** Signed-in only (the Request node's default); fetch the caller; answer their username, or the error. */
const WHOAMI = {
  components: [
    {
      name: '/#__cloud__/whoami',
      nodes: [
        { id: 'req', type: 'noodl.cloud.request', x: 0, y: 0, parameters: {}, ports: [], children: [] },
        { id: 'user', type: 'net.noodl.user.User', x: 0, y: 100, parameters: {}, ports: [], children: [] },
        { id: 'res', type: 'noodl.cloud.response', x: 0, y: 200, parameters: { params: 'name' }, ports: [], children: [] },
        { id: 'resErr', type: 'noodl.cloud.response', x: 300, y: 200, parameters: { params: 'error' }, ports: [], children: [] }
      ],
      connections: [
        { sourceId: 'req', sourcePort: 'receive', targetId: 'user', targetPort: 'fetch' },
        { sourceId: 'user', sourcePort: 'fetched', targetId: 'res', targetPort: 'send' },
        { sourceId: 'user', sourcePort: 'prop-username', targetId: 'res', targetPort: 'pm-name' },
        { sourceId: 'user', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' },
        { sourceId: 'user', sourcePort: 'error', targetId: 'resErr', targetPort: 'pm-error' }
      ],
      roots: []
    }
  ],
  settings: {},
  metadata: {}
};

const ADMIN_TOKEN = 'admin-token-for-p127-cloud-user';

/** Enforcement ON: under dev-open every gate is relaxed and "no wider than the record read" would compare nothing. */
const LOCKED = {
  version: 1,
  devOpen: false,
  defaults: {
    permissions: { find: 'authenticated', get: 'authenticated', create: 'authenticated', update: 'authenticated', delete: 'authenticated' },
    creatorOwns: true
  },
  collections: {},
  functions: {},
  files: { upload: 'authenticated', read: 'authenticated', delete: 'nobody' },
  signup: 'public'
};

describe('P127-BKO006-CLOUDUSERNODE — a User node in a function reads the caller', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const http = httpClient(() => base);

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-p127-clouduser-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'workflows', 'whoami.workflow.json'), JSON.stringify(WHOAMI));
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(LOCKED, null, 2));
    service = new BackendService({ dataDir, port: 0, backendId: 'backend_p127clouduser', backendName: 'P127', authToken: ADMIN_TOKEN });
    const started = await service.start();
    expect(started.security.enforced).toBe(true);
    base = started.listen.url;
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('a signed-in caller: the User node fetches them and the function answers with their username', async () => {
    const signup = await http.request<{ objectId: string; sessionToken: string }>('POST', '/users', {
      body: { username: 'mechanic-mo', password: 'a-long-password-1' }
    });
    expect(signup.status).toBe(201);
    const called = await http.request<{ result?: { name?: string; error?: string } }>('POST', '/functions/whoami', {
      body: {},
      headers: { 'x-parse-session-token': signup.json.sessionToken }
    });
    expect(called.json).toEqual({ result: { name: 'mechanic-mo' } });
    expect(called.status).toBe(200);
  });

  it('the new read is no wider than the record read: a visitor asking for a user by id gets what /classes/_User/:id gives them', async () => {
    const signup = await http.request<{ objectId: string }>('POST', '/users', { body: { username: 'customer-cy', password: 'a-long-password-2' } });
    const byWire = await http.request('GET', `/classes/_User/${signup.json.objectId}`);
    const byUsers = await http.request<Record<string, unknown>>('GET', `/users/${signup.json.objectId}`);
    expect(byWire.status).toBeGreaterThanOrEqual(400);
    expect(byUsers.status).toBe(byWire.status);
    const withoutRequestId = (j: unknown) => ({ ...(j as Record<string, unknown>), requestId: undefined });
    expect(withoutRequestId(byUsers.json)).toEqual(withoutRequestId(byWire.json));
    expect(JSON.stringify(byUsers.json)).not.toMatch(/hashed_password|scrypt\$/);
  });
});
