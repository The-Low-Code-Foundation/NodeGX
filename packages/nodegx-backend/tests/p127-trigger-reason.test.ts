/**
 * P127-BKO006-SCHEDULEREASON — a trigger whose function refuses it says why.
 *
 * BKO-006's book club: a Monday schedule ran a function that takes no call without a signed-in person. A schedule has
 * none, so every fire was refused, and the trigger's last result read "Target returned HTTP 500" and nothing else. The
 * agent guessed the cause and made the function public. The function had said why; the record now keeps it.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BackendService } from '../src/service';
import { httpClient } from './helpers/http';

jest.setTimeout(30000);

/** A function with the Request node's default: no call without a signed-in person. */
const GUARDED = {
  components: [
    {
      name: '/#__cloud__/Cloud Functions/Weekly Digest',
      nodes: [
        { id: 'req1', type: 'noodl.cloud.request', x: 0, y: 0, parameters: {}, ports: [], children: [] },
        { id: 'res1', type: 'noodl.cloud.response', x: 0, y: 200, parameters: {}, ports: [], children: [] }
      ],
      connections: [{ sourceId: 'req1', sourcePort: 'receive', targetId: 'res1', targetPort: 'send' }],
      roots: []
    }
  ],
  settings: {},
  metadata: {}
};

const ADMIN_TOKEN = 'admin-token-for-p127-reason';

describe('P127-BKO006-SCHEDULEREASON — a refused fire keeps the function’s reason', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  const http = httpClient(() => base);
  const req = <T = unknown>(method: string, p: string, body?: unknown) =>
    http.request<T>(method, p, { body, headers: { authorization: `Bearer ${ADMIN_TOKEN}` } });

  beforeAll(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-p127-reason-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'workflows', 'club.workflow.json'), JSON.stringify(GUARDED));
    service = new BackendService({ dataDir, port: 0, backendId: 'backend_p127reason', backendName: 'P127', authToken: ADMIN_TOKEN });
    base = (await service.start()).listen.url;
  });

  afterAll(async () => {
    await service.stop();
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('fired, the schedule is refused, and its last result says what the function said', async () => {
    const made = await req<{ trigger: { id: string } }>('POST', '/admin/triggers', {
      type: 'schedule',
      name: 'Monday digest',
      target: { kind: 'function', name: 'Cloud Functions/Weekly Digest' },
      schedule: { cron: '0 8 * * 1', missedFirePolicy: 'skip' }
    });
    expect(made.status).toBe(201);
    const id = made.json.trigger.id;
    await req('POST', `/admin/triggers/${id}/fire`, {});
    const got = await req<{ trigger: { status: { lastResult: { ok: boolean; error?: string } } } }>('GET', `/admin/triggers/${id}`);
    const last = got.json.trigger.status.lastResult;
    expect(last.ok).toBe(false);
    expect(last.error).toMatch(/^Target returned HTTP \d+: \S/);
    expect(last.error).toMatch(/auth/i);
  });
});
