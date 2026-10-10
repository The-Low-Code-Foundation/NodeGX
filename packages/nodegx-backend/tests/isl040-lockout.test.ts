/**
 * P109 ISL-040 — P100-UPG001-LOCKOUT: ten rejected credentials from one address locked it out of EVERY
 * route for five minutes — `/health` and anonymous public reads included. One browser retrying an
 * expired session, or a NAT full of people, took the app offline for everyone behind it.
 *
 * BAK-005's limiter is a speed bump against guessing a credential, so it now holds back only requests
 * that carry one. What it does NOT do (pinned below, waiting on a ruling): let a locked-out address
 * through because its credential is right. That would answer a guesser 429 for wrong and 200 for right,
 * which is the speed bump removed.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { defaultSecurityConfig } from '../src/security/model';
import { BackendService } from '../src/service';
import { request } from './helpers/http';

jest.setTimeout(60000);

describe('ISL-040 P100-UPG001-LOCKOUT — the lockout holds back credentials, not the address', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const BAD = { authorization: 'Bearer not-the-token' };

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isl040-lockout-'));
    // A collection anyone may read, so an anonymous read has something to answer with.
    const security = defaultSecurityConfig();
    security.devOpen = false;
    security.defaults.permissions = { ...security.defaults.permissions, find: 'public', get: 'public' };
    fs.writeFileSync(path.join(dataDir, 'security.json'), JSON.stringify(security));
    fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
    service = new BackendService({ dataDir, port: 0, backendId: 'isl040l', backendName: 'lockout', authToken: 't0k' });
    base = (await service.start()).listen.url;
    expect((await request(base, 'POST', '/classes/Notice', { body: { text: 'hello' }, headers: { authorization: 'Bearer t0k' } })).status).toBe(201);
    for (let i = 0; i < 10; i++) {
      const res = await request(base, 'GET', '/classes/Notice', { headers: BAD });
      expect([i, res.status]).toEqual([i, 401]);
    }
  });
  afterAll(async () => {
    if (service) await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('known-firing: the eleventh bad credential is refused with 429', async () => {
    expect((await request(base, 'GET', '/classes/Notice', { headers: BAD })).status).toBe(429);
  });

  it('/health still answers from that address', async () => {
    expect((await request(base, 'GET', '/health')).status).toBe(200);
  });

  it('an anonymous public read still answers from that address', async () => {
    const res = await request<{ results: unknown[] }>(base, 'GET', '/classes/Notice');
    expect(res.status).toBe(200);
    expect(res.json.results.length).toBe(1);
  });

  it.each([['x-parse-session-token'], ['x-parse-master-key'], ['x-nodegx-api-key']])(
    'a request carrying %s is still held back',
    async (header) => {
      expect((await request(base, 'GET', '/classes/Notice', { headers: { [header]: 'guess' } })).status).toBe(429);
    }
  );

  it('PINNED pending a ruling: a RIGHT credential from the locked-out address is held back too (no 429-for-wrong, 200-for-right answer key)', async () => {
    expect((await request(base, 'GET', '/classes/Notice', { headers: { authorization: 'Bearer t0k' } })).status).toBe(429);
  });
});
